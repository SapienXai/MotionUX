"""Local MotionUX backup archives. Python 3.9+."""
import argparse
import hashlib
import http.client
import json
import os
from pathlib import Path, PurePosixPath
import shutil
import subprocess
import tarfile
import tempfile
from datetime import datetime, timezone
from contextlib import closing

VERSION = 1
VAULT_DIRS = {"runtime", "designbookmark", "registry", "discovery", "thumbnails"}
CACHE_DIRS = {"node_modules", ".next", ".git", ".vite"}
MAX_BYTES = 12 * 1024 ** 3
CHUNK = 1024 * 1024


def clock():
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S.%fZ")


def allowed(name, scope):
    path = PurePosixPath(name)
    if path.is_absolute() or path.as_posix() != name or not path.parts or any(
        part in {"..", "."} or "\\" in part or any(ord(c) < 32 for c in part)
        for part in path.parts
    ):
        return False
    if any(part in CACHE_DIRS for part in path.parts):
        return False
    root = path.parts[0]
    if root == "user":
        return scope in {"library", "all"} and name == "user/library.v1.json"
    return scope in {"vault", "all"} and (
        root in VAULT_DIRS and len(path.parts) > 1 or
        len(path.parts) == 1 and root.endswith(".json")
    )


def files(vault, scope):
    if scope in {"vault", "all"}:
        for root, folders, names in os.walk(vault):
            relative = Path(root).relative_to(vault)
            folders[:] = [name for name in folders if name not in CACHE_DIRS
                          and (relative.parts or name in VAULT_DIRS)]
            for name in names:
                file = Path(root, name)
                path = file.relative_to(vault).as_posix()
                if allowed(path, scope) and not file.is_symlink() and file.is_file():
                    yield path, file
    if scope in {"library", "all"}:
        file = vault / "user" / "library.v1.json"
        if file.is_file() and not file.is_symlink():
            yield "user/library.v1.json", file


class CopyHash:
    def __init__(self, stream):
        self.stream = stream
        self.hash = hashlib.sha256()

    def read(self, size):
        data = self.stream.read(size)
        self.hash.update(data)
        return data


def backup(vault, scope, dest):
    if not vault.is_dir():
        raise ValueError("The source vault is missing. Prepare it or restore an existing archive.")
    entries = sorted(files(vault, scope))
    if not entries:
        raise ValueError("No files found for that backup scope.")
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists():
        raise ValueError("Choose a new archive filename.")
    with tempfile.NamedTemporaryFile(dir=dest.parent, prefix=".motionux-", delete=False) as temporary:
        temp = Path(temporary.name)
    try:
        with tarfile.open(temp, "w:gz", compresslevel=1) as archive:
            inventory = {}
            for name, file in entries:
                with file.open("rb") as stream:
                    info = tarfile.TarInfo(name)
                    info.size = os.fstat(stream.fileno()).st_size
                    info.mode = 0o600
                    contents = CopyHash(stream)
                    archive.addfile(info, contents)
                    inventory[name] = {"sha256": contents.hash.hexdigest(), "size": info.size}
            manifest = json.dumps({"schemaVersion": VERSION, "scope": scope, "created": clock(),
                                   "notes": "Prepared runtime, registry assets and selected personal data. Dependency caches and Git checkouts are regenerable.",
                                   "files": inventory}, indent=2).encode()
            import io
            info = tarfile.TarInfo("manifest.json")
            info.size = len(manifest)
            info.mode = 0o600
            archive.addfile(info, io.BytesIO(manifest))
        os.link(temp, dest)
    finally:
        temp.unlink(missing_ok=True)
    print(f"Saved {len(entries)} verified archive entries to {dest}")


def ensure_stopped(vault):
    if vault != (Path.cwd() / ".motionux-v9").resolve():
        return
    try:
        with closing(http.client.HTTPConnection("127.0.0.1", 5199, timeout=1)) as connection:
            connection.request("GET", "/")
            connection.getresponse()
    except ConnectionRefusedError:
        return
    except OSError as error:
        raise ValueError("Could not confirm that Studio is stopped.") from error
    raise ValueError("Stop MotionUX Studio before restoring its vault.")


def stage_archive(source, staging):
    inventory = {}
    seen = set()
    manifest = None
    total = 0
    with tarfile.open(source, "r|gz") as archive:
        for member in archive:
            total += member.size
            if total > MAX_BYTES or len(seen) >= 100000 or not member.isfile() or member.name in seen:
                raise ValueError("Archive contains invalid, duplicate or oversized members.")
            seen.add(member.name)
            stream = archive.extractfile(member)
            if member.name == "manifest.json":
                if member.size > 20 * 1024 * 1024:
                    raise ValueError("Archive manifest is too large.")
                manifest = json.load(stream)
                continue
            if not allowed(member.name, "all"):
                raise ValueError("Archive contains a path outside its vault scope.")
            path = staging / member.name
            path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
            contents = CopyHash(stream)
            with path.open("xb") as output:
                shutil.copyfileobj(contents, output, CHUNK)
            path.chmod(0o600)
            inventory[member.name] = {"sha256": contents.hash.hexdigest(), "size": member.size}
    if not inventory or not isinstance(manifest, dict) or manifest.get("schemaVersion") != VERSION or manifest.get("files") != inventory:
        raise ValueError("Archive file list or SHA-256 checksum did not match.")
    if not all(allowed(name, manifest.get("scope")) for name in inventory):
        raise ValueError("Archive scope did not match its files.")
    if "user/library.v1.json" in inventory:
        library_path = staging / "user/library.v1.json"
        validator = """import {readFile} from 'node:fs/promises';
import {normalizeLibrary,libraryLimit} from './scripts/studio/v11/library.mjs';
const text = await readFile(process.argv[1]);
if (text.length > libraryLimit) process.exit(1);
normalizeLibrary(JSON.parse(text));
"""
        result = subprocess.run(["node", "--input-type=module", "-e", validator, str(library_path)],
                                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if result.returncode:
            raise ValueError("Invalid or unsupported library data.")
    return inventory


def restore(vault, source, check):
    if not check:
        ensure_stopped(vault)
    vault.mkdir(parents=True, exist_ok=True, mode=0o700)
    recovery = vault / "recovery"
    if recovery.is_symlink():
        raise ValueError("The recovery directory must be inside the vault.")
    recovery.mkdir(exist_ok=True, mode=0o700)
    with tempfile.TemporaryDirectory(dir=recovery, prefix=".restore-") as temporary:
        staging = Path(temporary)
        inventory = stage_archive(source, staging)
        if check:
            print(f"Validated {len(inventory)} files and SHA-256 checks without replacing data")
            return
        targets = sorted({name if name.startswith("user/") else name.split("/")[0] for name in inventory})
        if "user/library.v1.json" in targets and (vault / "user").is_symlink():
            raise ValueError("The library directory must be inside the vault.")
        saved = recovery / ("before-" + clock())
        displaced = []
        installed = []
        try:
            for name in targets:
                destination = vault / name
                if destination.exists() or destination.is_symlink():
                    old = saved / name
                    old.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
                    destination.rename(old)
                    displaced.append((old, destination))
                destination.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
                (staging / name).rename(destination)
                installed.append((destination, staging / name))
        except OSError:
            for installed_path, original_path in reversed(installed):
                installed_path.rename(original_path)
            for old, destination in reversed(displaced):
                old.rename(destination)
            raise
        print(f"Restored {len(inventory)} verified files. Previous data: {saved if displaced else 'no existing destination'}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    modes = parser.add_subparsers(dest="mode", required=True)
    for mode in ("backup", "restore"):
        action = modes.add_parser(mode)
        action.add_argument("archive", type=Path)
        action.add_argument("--vault", type=Path, default=Path(".motionux-v9"))
    modes.choices["backup"].add_argument("--scope", choices=["vault", "library", "all"], default="all")
    modes.choices["restore"].add_argument("--check", action="store_true")
    args = parser.parse_args()
    vault = args.vault.resolve()
    archive = args.archive.resolve()
    if args.mode == "backup":
        repo = Path.cwd()
        if repo in archive.parents and (repo / ".motionux-v9") not in archive.parents and vault == (repo / ".motionux-v9").resolve():
            parser.error("Save the private archive in .motionux-v9 or outside the public repository.")
        backup(vault, args.scope, archive)
    else:
        restore(vault, archive, args.check)


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, tarfile.TarError) as error:
        raise SystemExit(str(error))
