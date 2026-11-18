"use client";

import { AlertCircle, Check, Circle, LoaderCircle, RotateCcw, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { useSourceJob } from "./source-job";
import { useStudioCopy } from "./kinetic-ui";

const steps = [
  ["analyzing", "Brief", "Fikir", "Fikir değerlendiriliyor"],
  ["selecting", "Sources", "Kaynak", "Kaynaklar ve bağımlılıklar denetleniyor"],
  ["composing", "Compose", "Tasarım", "Sayfalar ve etkileşimler oluşturuluyor"],
  ["building", "Build", "Derleme", "İzole uygulama derleniyor"],
  ["verifying", "Verify", "Kontrol", "Tarayıcıda uygulama doğrulanıyor"],
];

export function SourceJobStatus({ operation }: { operation: ReturnType<typeof useSourceJob> }) {
  const t = useStudioCopy();
  const { job, active, starting, error, cancel, retry, reconnecting } = operation;
  const panel = useRef<HTMLElement>(null);
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!active) return;
    function tick() { setNow(Date.now()); }
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [active]);
  useEffect(() => {
    if (starting) panel.current?.scrollIntoView({ block: "nearest" });
  }, [starting]);

  if (active) {
    const step = starting ? 0 : Math.max(0, steps.findIndex(([status]) => status === job?.status));
    const elapsed = starting || !job?.started ? 0 : Math.max(0, Math.floor((now - job.started) / 1000));
    const clock = Math.floor(elapsed / 60) + ":" + String(elapsed % 60).padStart(2, "0");
    const repair = starting ? 0 : job?.repairAttempt ?? 0;
    return <section className="source-progress" ref={panel} aria-label={t("App generation progress", "Uygulama üretim aşamaları")}>
      <div className="source-progress-main">
        <div className="source-progress-orbit" aria-hidden="true"><Sparkles size={23} /></div>
        <div role="status">
          <h2>{repair ? t("Refining your app", "Uygulaman iyileştiriliyor") : t("Creating your app", "Uygulaman oluşturuluyor")}</h2>
          <p>{reconnecting ? t("Reconnecting to your generation…", "Üretime yeniden bağlanılıyor…") : starting ? t("Opening a local Build workspace", "Yerel Build çalışma alanı açılıyor") : t(job?.message ?? "", steps[step][3])}</p>
        </div>
        <time aria-hidden="true" dateTime={`PT${elapsed}S`}>{clock}</time>
      </div>
      <ol aria-label={t("Build stages", "Üretim aşamaları")} className="source-progress-steps">
        {steps.map(([status, title, localized], index) => <li key={status} aria-current={index === step ? "step" : undefined} data-complete={index < step}>
          {index < step ? <Check size={14} aria-label={t("Complete", "Tamamlandı")} /> : index === step ? <LoaderCircle size={14} aria-hidden="true" /> : <Circle size={12} aria-hidden="true" />}
          {t(title, localized)}
        </li>)}
      </ol>
      <div className="source-progress-actions">
        <span>{repair ? t("Checking fixes · attempt ", "Düzeltmeler kontrol ediliyor · deneme ") + repair + " / 2" : t("Your app opens after the browser checks.", "Tarayıcı kontrollerinden sonra uygulama açılır.")}</span>
        <button type="button" className="build-button" onClick={() => void cancel()} disabled={starting}>{t("Cancel generation", "Üretimi iptal et")}</button>
      </div>
      {error && <p role="alert">{error}</p>}
    </section>;
  }

  if (!job && !error) return null;
  const failed = job?.status === "failed";
  const canRetry = (failed || job?.status === "cancelled") && Boolean(job?.attempts?.length);
  const detail = error || job?.message;
  const title = failed
    ? job.message.startsWith("Accessibility at ") ? t("Build found an accessibility issue", "Build bir erişilebilirlik sorunu buldu") : t("Build couldn’t finish this app", "Build uygulamayı tamamlayamadı")
    : error ? t("Build couldn’t complete this action", "Build işlemi tamamlayamadı") : job?.status === "ready" ? t("Your app is ready", "Uygulaman hazır") : t("Generation cancelled", "Üretim iptal edildi");
  return <section className="source-job-status">
    <div className="source-job-summary" role={failed || error ? "alert" : "status"}>
      {failed || error ? <AlertCircle size={18} aria-hidden="true" /> : <Check size={18} aria-hidden="true" />}
      <div>
        <h2>{title}</h2>
        {failed && <p>{canRetry ? t("Your brief, components and generated draft are available to retry.", "Fikrin, bileşenlerin ve oluşturulan taslak yeniden denemeye hazır.") : t("Your brief and components are available for a new attempt.", "Fikrin ve bileşenlerin yeni bir deneme için hazır.")}</p>}
      </div>
    </div>
    {job?.warnings?.map((warning) => <p key={warning}>{warning}</p>)}
    {(failed || error) && detail && <details className="source-job-diagnostics">
      <summary>{t("Technical details", "Teknik ayrıntılar")}</summary><p>{detail}</p>
    </details>}
    {canRetry && <button type="button" className="build-button" onClick={() => void retry()}><RotateCcw size={15} aria-hidden="true" /> {t("Retry generated application", "Uygulama üretimini yeniden dene")}</button>}
  </section>;
}
