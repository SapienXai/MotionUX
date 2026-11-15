import { DisclosureView } from "../../ui/disclosure-view";

const details = [
  { id: "arrival", title: "Giriş ve anahtar teslimi hakkında ayrıntılar", body: "Oda anahtarı saat 15.00'ten itibaren resepsiyondan teslim alınabilir." },
  { id: "access", title: "Erişilebilir ulaşım ve bina girişi", body: "Ana girişe giden rampanın yanında dinlenme alanı vardır." },
];
export default function DetailsPage() {
  return <><header><p>Kıyı Evi</p><h1>Konaklama bilgileri</h1></header>
    <DisclosureView rows={details} />
    <a href="/checkout">İletişim bilgileri</a>
  </>;
}
