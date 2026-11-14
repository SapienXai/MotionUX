import { useState } from "react";
import { createRoot } from "react-dom/client";
import { BedDouble, CalendarDays, House, Menu } from "lucide-react";
import { MotionDock } from "../components/motion-dock";
import { MotionDisclosure } from "../components/motion-disclosure";
import { MotionStatusPill, type MotionStatus } from "../components/motion-status-pill";
import { MotionProvider } from "../components/motion-provider";
import { motionPresets } from "../components/presets";
import * as m from "motion/react-m";
import "./styles.css";

const statusLabels: Record<MotionStatus, string> = {
  neutral: "İşlem başlatılmadı",
  loading: "İşlem bilgisi kontrol ediliyor",
  pending: "Müşterinin ödeme onayı bekleniyor",
  success: "Tahsilat sunucu tarafından doğrulandı",
  error: "İşlem doğrulanamadı. Geçmişten tekrar kontrol edin.",
};
const tabs = [
  ["ev", "Ana sayfa", House],
  ["oda", "Odalar", BedDouble],
  ["takvim", "Rezervasyon", CalendarDays],
] as const;

function Example() {
  const [active, setActive] = useState<string>(location.hash.slice(1) || "ev");
  const [more, setMore] = useState(false);
  const [status, setStatus] = useState<MotionStatus>("pending");
  const [on, setOn] = useState(false);
  return (
    <main>
      <header>
        <h1>MotionUX</h1>
        <p>Ürün arayüzleri için ortak hareket ve durum bileşenleri. Bu sayfadaki işlem durumları test verisidir.</p>
      </header>
      <section id="ev">
        <h2>Alt navigasyon</h2>
        <MotionDock className="sample-dock" aria-label="Örnek navigasyon">
          {tabs.map(([key, label, Icon]) => (
            <a href={`#${key}`} key={key} aria-current={active === key ? "location" : undefined} onClick={() => { setActive(key); setMore(false); }}>
              <Icon aria-hidden="true" size={20} />{label}
            </a>
          ))}
          <button type="button" aria-expanded={more} aria-controls="more-panel" onClick={() => setMore(!more)}>
            <Menu aria-hidden="true" size={20} />Daha fazla
          </button>
        </MotionDock>
        <p id="more-panel" hidden={!more}>Ek otel bilgileri ve iletişim.</p>
      </section>
      <section id="oda">
        <h2>Açılır içerik</h2>
        <MotionDisclosure label="Oda olanaklarını ve konaklama koşullarını inceleyin">
          <p>İki kişilik oda. Giriş saat 15.00, çıkış saat 11.00.</p>
          <a href="#takvim">Rezervasyon bölümüne git</a>
        </MotionDisclosure>
      </section>
      <section id="takvim">
        <h2>İşlem durumu</h2>
        <div className="sample-status">
          <MotionStatusPill status={status} label={statusLabels[status]} announce />
        </div>
        <div className="choices">
          <label htmlFor="state">Test durumu</label>
          <select id="state" value={status} onChange={(e) => setStatus(e.target.value as MotionStatus)}>
            {Object.entries(statusLabels).map(([key, label]) => <option value={key} key={key}>{label}</option>)}
          </select>
          <button type="button" disabled>İşleme devam et</button>
        </div>
      </section>
      <section>
        <h2>Ortak ayarlar</h2>
        <MotionProvider>
          <m.button type="button" aria-pressed={on} onClick={() => setOn(!on)} initial={false}
            animate={{ scale: on ? 0.97 : 1 }} transition={motionPresets.settle}>Hareket örneği</m.button>
        </MotionProvider>
      </section>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<Example />);
