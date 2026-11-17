"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  allBlocks,
  referencedMedia,
  seedImages,
  type BlockId,
  type BlockProps,
  type Document,
} from "@motionux/build-core";
import "./media.css";

export type MediaRecord = {
  id: string;
  name: string;
  width: number;
  height: number;
  rights: "uploader-attested" | "generated-demo";
};
export function MediaPanel({
  project,
  document,
  onDocument,
  onPurged,
  onInventory,
}: {
  project: string;
  document: Document;
  onDocument: (edit: (previous: Document) => Document) => void;
  onPurged: (id: string) => void;
  onInventory?: (items: MediaRecord[]) => void;
}) {
  const endpoint = "/api/build/" + project + "/media";
  const [items, setItems] = useState<MediaRecord[]>([]);
  const [file, setFile] = useState<File>();
  const [rights, setRights] = useState(false);
  const [query, setQuery] = useState("");
  const [usage, setUsage] = useState("all");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<MediaRecord>();
  const [backupFile, setBackupFile] = useState<File>();
  const confirmation = useRef<HTMLDialogElement>(null);
  const modal = useRef<HTMLDialogElement>(null);
  const job = useRef<AbortController>(null);
  const tr = document.locale === "tr";
  const t = (en: string, turkish: string) => (tr ? turkish : en);
  useEffect(() => {
    const read = new AbortController();
    void fetch(endpoint, { signal: read.signal })
      .then(async (response) => {
        if (response.ok) setItems(await response.json());
        else if (!read.signal.aborted)
          setError(
            tr ? "Görseller yüklenemedi." : "Media library could not load.",
          );
      })
      .catch(() => {});
    return () => {
      read.abort();
      job.current?.abort();
    };
  }, [endpoint, tr]);
  useEffect(() => { onInventory?.(items); }, [items, onInventory]);
  const references = referencedMedia(document);
  function add(id: string) {
    onDocument((previous) =>
      previous.assets.includes(id)
        ? previous
        : { ...previous, assets: [...previous.assets, id] },
    );
  }
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || !rights || job.current) return;
    const controller = new AbortController();
    job.current = controller;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        body: file,
        signal: controller.signal,
        headers: {
          "X-MotionUX-Build": "1",
          "Content-Type": file.type,
          "X-MotionUX-Image-Name": encodeURIComponent(file.name),
          "X-MotionUX-Image-Rights": "confirmed",
        },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      const asset: MediaRecord = result;
      setItems((current) =>
        current.some(({ id }) => id === asset.id)
          ? current
          : [...current, asset],
      );
      add(asset.id);
      setMessage(
        t(
          "Image is ready to select in Properties.",
          "Görseli Özellikler bölümünden seçebilirsiniz.",
        ),
      );
      setFile(undefined);
      setRights(false);
    } catch (cause) {
      if (!controller.signal.aborted)
        setError(
          cause instanceof Error
            ? cause.message
            : t("Import failed.", "İçe aktarılamadı."),
        );
    } finally {
      job.current = null;
      setBusy(false);
    }
  }
  async function manage(operation: "backup" | "restore" | "purge") {
    if (job.current) return;
    const controller = new AbortController();
    job.current = controller;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const target =
        operation === "purge"
          ? endpoint + "/" + preview?.id
          : endpoint + "/backup";
      const response = await fetch(target, {
        method:
          operation === "purge"
            ? "DELETE"
            : operation === "restore"
              ? "POST"
              : "GET",
        headers: {
          "X-MotionUX-Build": "1",
          ...(operation === "restore"
            ? { "Content-Type": "application/json" }
            : {}),
        },
        body: operation === "restore" ? backupFile : undefined,
        signal: controller.signal,
      });
      if (!response.ok) throw new Error((await response.json()).message);
      if (operation === "backup") {
        const url = URL.createObjectURL(await response.blob());
        const link = window.document.createElement("a");
        link.href = url;
        link.download = "motionux-media-" + project + ".json";
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        setMessage(t("Media backup downloaded.", "Görsel yedeği indirildi."));
      } else if (operation === "restore") {
        const { restored, existing } = await response.json();
        const refreshed = await fetch(endpoint, { signal: controller.signal });
        if (!refreshed.ok)
          throw new Error(
            t("Media library could not load.", "Görseller yüklenemedi."),
          );
        setItems(await refreshed.json());
        setBackupFile(undefined);
        setMessage(
          t(
            `${restored} ${restored === 1 ? "image" : "images"} restored, ${existing} already present.`,
            `${restored} görsel geri yüklendi, ${existing} görsel zaten vardı.`,
          ),
        );
      } else if (preview) {
        setItems((current) => current.filter(({ id }) => id !== preview.id));
        onPurged(preview.id);
        confirmation.current?.close();
        modal.current?.close();
        setMessage(
          t("Image permanently deleted.", "Görsel kalıcı olarak silindi."),
        );
      }
    } catch (cause) {
      if (!controller.signal.aborted)
        setError(
          cause instanceof Error
            ? cause.message
            : t("Media operation failed.", "Görsel işlemi başarısız."),
        );
      confirmation.current?.close();
    } finally {
      job.current = null;
      setBusy(false);
    }
  }
  return (
    <section className="build-panel-section build-media">
      <div className="build-panel-title">
        <h2>{t("Media", "Görseller")}</h2>
      </div>
      <form
        onSubmit={upload}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          if (!busy) setFile(event.dataTransfer.files[0]);
        }}
      >
        <label>
          {t("Image file", "Görsel dosyası")}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            onChange={(event) => setFile(event.target.files?.[0])}
          />
        </label>
        {file && <span>{file.name}</span>}
        <label className="build-media-rights">
          <input
            type="checkbox"
            checked={rights}
            disabled={busy}
            onChange={(event) => setRights(event.target.checked)}
          />
          {t(
            "I can include this image in an export.",
            "Bu görseli dışa aktarımda kullanma hakkım var.",
          )}
        </label>
        <button className="build-button" disabled={busy || !rights || !file}>
          {t("Import image", "Görseli içe aktar")}
        </button>
        {busy && (
          <button
            className="build-button"
            type="button"
            onClick={() => {
              job.current?.abort();
              setMessage(t("Import cancelled.", "İçe aktarma iptal edildi."));
            }}
          >
            {t("Cancel", "İptal")}
          </button>
        )}
      </form>
      <details className="build-media-backup">
        <summary>{t("Media backup", "Görsel yedeği")}</summary>
        <button
          className="build-button"
          type="button"
          disabled={busy}
          onClick={() => void manage("backup")}
        >
          {t("Download media backup", "Görsel yedeğini indir")}
        </button>
        <label>
          {t("Backup file", "Yedek dosyası")}
          <input
            type="file"
            accept="application/json,.json"
            disabled={busy}
            onChange={(event) => setBackupFile(event.target.files?.[0])}
          />
        </label>
        <button
          className="build-button"
          type="button"
          disabled={busy || !backupFile}
          onClick={() => void manage("restore")}
        >
          {t("Restore media backup", "Görsel yedeğini yükle")}
        </button>
      </details>
      {error && !preview && <p role="alert">{error}</p>}
      <p role="status">{message}</p>
      <label>
        {t("Find images", "Görselleri ara")}
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <label>{t("Image usage", "Görsel kullanımı")}
        <select value={usage} onChange={(event) => setUsage(event.target.value)}>
          <option value="all">{t("All images", "Tüm görseller")}</option>
          <option value="used">{t("Used in draft", "Taslakta kullanılıyor")}</option>
          <option value="unused">{t("Unused in draft", "Taslakta kullanılmıyor")}</option>
        </select>
      </label>
      <ul className="build-media-grid">
        {items
          .filter(({ name, id }) =>
            (usage === "all" || references.has(id) === (usage === "used")) &&
            name.toLocaleLowerCase(document.locale).includes(query.toLocaleLowerCase(document.locale)),
          )
          .map((item) => (
            <li key={item.id}>
              <button
                type="button"
                aria-label={t("Preview ", "Önizle ") + item.name}
                onClick={() => {
                  setError("");
                  setPreview(item);
                  modal.current?.showModal();
                }}
              >
                <img
                  src={endpoint + "/" + item.id + "-360.webp"}
                  alt=""
                  width="90"
                  height="90"
                  loading="lazy"
                />
                <span>{item.name}</span>
              </button>
            </li>
          ))}
      </ul>
      <dialog
        className="build-dialog build-image-dialog"
        aria-label={t("Image preview", "Görsel önizlemesi")}
        ref={modal}
        onClose={() => setPreview(undefined)}
      >
        {preview && (
          <>
            <h2>{preview.name}</h2>
            <img
              src={endpoint + "/" + preview.id + "-720.webp"}
              alt=""
              width="720"
              height="720"
            />
            <p>
              {preview.width} × {preview.height} ·{" "}
              {references.has(preview.id)
                ? t("Used on the site", "Sitede kullanılıyor")
                : t("Unused", "Kullanılmıyor")}
            </p>
            {references.has(preview.id) && <ul className="creator-media-usage">
              {document.pages.filter((page) => allBlocks(page.blocks).some(({ props }) =>
                props.image?.asset === preview.id || props.items?.some(({ asset }) => asset === preview.id),
              )).map((page) => <li key={page.id}>{page.title}</li>)}
            </ul>}
            {document.assets.includes(preview.id) ? (
              <button
                type="button"
                className="build-button"
                disabled={references.has(preview.id)}
                onClick={() => {
                  onDocument((previous) => ({
                    ...previous,
                    assets: previous.assets.filter((id) => id !== preview.id),
                  }));
                  modal.current?.close();
                }}
              >
                {t("Remove from project", "Projeden çıkar")}
              </button>
            ) : (
              <button
                type="button"
                className="build-button"
                onClick={() => {
                  add(preview.id);
                  modal.current?.close();
                }}
              >
                {t("Add to project", "Projeye ekle")}
              </button>
            )}
          </>
        )}
        {preview?.rights === "uploader-attested" && (
          <button
            type="button"
            className="build-button"
            disabled={busy || document.assets.includes(preview.id)}
            onClick={() => confirmation.current?.showModal()}
          >
            {t("Delete image permanently", "Görseli kalıcı olarak sil")}
          </button>
        )}
        {error && preview && <p role="alert">{error}</p>}
        <button
          type="button"
          className="build-button"
          onClick={() => modal.current?.close()}
        >
          {t("Close", "Kapat")}
        </button>
      </dialog>
      <dialog
        className="build-dialog"
        ref={confirmation}
        aria-labelledby="media-purge-title"
      >
        <h2 id="media-purge-title">
          {t(
            "Delete this image permanently?",
            "Bu görsel kalıcı olarak silinsin mi?",
          )}
        </h2>
        <p>
          {t(
            "A media backup is required to recover the image after deletion.",
            "Sildikten sonra görseli kurtarmak için medya yedeği gerekir.",
          )}
        </p>
        <div>
          <button
            className="build-button"
            type="button"
            autoFocus
            onClick={() => confirmation.current?.close()}
          >
            {t("Keep image", "Görseli tut")}
          </button>
          <button
            className="build-button"
            type="button"
            disabled={busy}
            onClick={() => void manage("purge")}
          >
            {t("Delete image", "Görseli sil")}
          </button>
        </div>
      </dialog>
    </section>
  );
}

export function MediaFields({
  type,
  props,
  document,
  media,
  mediaBase,
  change,
}: {
  type: BlockId;
  props: BlockProps;
  document: Document;
  media: MediaRecord[];
  mediaBase: string;
  change: (next: Partial<BlockProps>) => void;
}) {
  const tr = document.locale === "tr";
  const options = document.assets.map((id) => (
    <option key={id} value={id}>
      {media.find((item) => item.id === id)?.name ?? seedImages[id as keyof typeof seedImages] ?? id.slice(0, 12)}
    </option>
  ));
  const routes = document.pages.map((page) => (
    <option key={page.id} value={page.route}>
      {page.title}
    </option>
  ));
  const item = props.items ?? [];
  const changeItem = (index: number, value: Partial<(typeof item)[number]>) =>
    change({
      items: item.map((entry, at) =>
        at === index ? { ...entry, ...value } : entry,
      ),
    });
  const hasImage = ["HeroEditorial", "HeroSplit", "StorySection"].includes(
    type,
  );
  const hasItems = [
    "LogoCloud",
    "FeatureBento",
    "StatsStrip",
    "GalleryGrid",
    "RoomCollection",
    "AmenityGrid",
    "Testimonials",
    "PricingCards",
    "FAQAccordion",
  ].includes(type);
  return (
    <>
      {hasImage && (
        <>
          <label>
            {tr ? "Blok görseli" : "Block image"}
            <select
              value={props.image?.asset ?? ""}
              onChange={(event) =>
                change({
                  image: event.target.value
                    ? {
                        asset: event.target.value,
                        alt: props.image?.asset === event.target.value ? props.image.alt : "",
                        focal: props.image?.focal ?? "center",
                      }
                    : undefined,
                })
              }
            >
              <option value="">{tr ? "Görsel yok" : "No image"}</option>
              {options}
            </select>
          </label>
          {props.image && (
            <>
              <div className="creator-crop-preview">
                <img src={mediaBase + props.image.asset + "-360.webp"} alt=""
                  width="360" height="360" loading="lazy"
                  style={{ objectPosition: props.image.focal, objectFit: props.imageFit ?? "cover" }} />
              </div>
              <label>{tr ? "Görseli yerleştir" : "Image fit"}
                <select value={props.imageFit ?? "cover"} onChange={(event) => change({ imageFit: event.target.value === "contain" ? "contain" : "cover" })}>
                  <option value="cover">{tr ? "Doldur ve kırp" : "Fill and crop"}</option>
                  <option value="contain">{tr ? "Görselin tamamını göster" : "Show whole image"}</option>
                </select>
              </label>
              <label>
                {tr ? "Alternatif metin" : "Image alt text"}
                <input
                  maxLength={180}
                  value={props.image.alt}
                  onChange={(event) => {
                    if (props.image)
                      change({
                        image: { ...props.image, alt: event.target.value },
                      });
                  }}
                />
              </label>
              <p className="build-hint">{tr ? "Anlamlı görselleri kısaca tarif edin. Dekoratif görselleri boş bırakın." : "Describe meaningful images briefly. Leave decorative images blank."}</p>
              <label>
                {tr ? "Odak" : "Image focal position"}
                <select
                  value={props.image.focal}
                  onChange={(event) => {
                    const focal = event.target.value;
                    if (
                      props.image &&
                      (focal === "top" ||
                        focal === "bottom" ||
                        focal === "center")
                    )
                      change({ image: { ...props.image, focal } });
                  }}
                >
                  <option value="top">{tr ? "Üst" : "Top"}</option>
                  <option value="center">{tr ? "Orta" : "Center"}</option>
                  <option value="bottom">{tr ? "Alt" : "Bottom"}</option>
                </select>
              </label>
            </>
          )}
        </>
      )}
      {["HeroEditorial", "HeroSplit", "CTASection", "PricingCards"].includes(
        type,
      ) && (
        <>
          <label>
            {tr ? "Eylem metni" : "Action label"}
            <input
              value={props.cta ?? ""}
              maxLength={64}
              onChange={(event) => change({ cta: event.target.value })}
            />
          </label>
          <label>
            {tr ? "Hedef sayfa" : "Destination page"}
            <select
              value={props.destination ?? ""}
              onChange={(event) =>
                change({ destination: event.target.value || undefined })
              }
            >
              <option value="">{tr ? "Yok" : "None"}</option>
              {routes}
            </select>
          </label>
        </>
      )}
      {hasItems && (
        <details className="build-media-items">
          <summary>{tr ? "İçerik öğeleri" : "Content items"}</summary>
          {item.map((entry, index) => (
            <fieldset key={index}>
              <legend>{entry.title || (tr ? "Öğe" : "Item")}</legend>
              <label>
                {tr ? "Başlık" : "Item title"}
                <input
                  maxLength={72}
                  value={entry.title}
                  onChange={(event) =>
                    changeItem(index, { title: event.target.value })
                  }
                />
              </label>
              <label>
                {tr ? "Metin" : "Item text"}
                <textarea
                  maxLength={300}
                  rows={2}
                  value={entry.text}
                  onChange={(event) =>
                    changeItem(index, { text: event.target.value })
                  }
                />
              </label>
              {["GalleryGrid", "RoomCollection", "FeatureBento"].includes(
                type,
              ) && (
                <>
                  <label>
                    {tr ? "Görsel" : "Item image"}
                    <select
                      value={entry.asset ?? ""}
                      onChange={(event) =>
                        changeItem(index, {
                          asset: event.target.value || undefined,
                        })
                      }
                    >
                      <option value="">{tr ? "Yok" : "None"}</option>
                      {options}
                    </select>
                  </label>
                  {entry.asset && (
                    <label>
                      {tr ? "Alternatif metin" : "Item alt text"}
                      <input
                        maxLength={180}
                        value={entry.alt ?? ""}
                        onChange={(event) =>
                          changeItem(index, { alt: event.target.value })
                        }
                      />
                    </label>
                  )}
                </>
              )}
              {type === "RoomCollection" && (
                <label>
                  {tr ? "Hedef" : "Room page"}
                  <select
                    value={entry.destination ?? ""}
                    onChange={(event) =>
                      changeItem(index, {
                        destination: event.target.value || undefined,
                      })
                    }
                  >
                    <option value="">{tr ? "Yok" : "None"}</option>
                    {routes}
                  </select>
                </label>
              )}
              <button
                className="build-button"
                type="button"
                disabled={index === 0}
                onClick={() => {
                  const reordered = [...item];
                  [reordered[index - 1], reordered[index]] = [
                    reordered[index],
                    reordered[index - 1],
                  ];
                  change({ items: reordered });
                }}
              >
                {tr ? "Yukarı taşı" : "Move item up"}
              </button>
              <button
                className="build-button"
                type="button"
                onClick={() =>
                  change({ items: item.filter((_, at) => at !== index) })
                }
              >
                {tr ? "Kaldır" : "Remove item"}
              </button>
            </fieldset>
          ))}
          <button
            className="build-button"
            type="button"
            disabled={item.length === 12}
            onClick={() =>
              change({ items: [...item, { title: "", text: "" }] })
            }
          >
            {tr ? "Öğe ekle" : "Add item"}
          </button>
        </details>
      )}
    </>
  );
}
