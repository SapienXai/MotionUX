export default function CheckoutPage() {
  return <><header><p>Kıyı Evi</p><h1>İletişim bilgileri</h1></header>
    <form>
      <label htmlFor="contact">E-posta adresi</label>
      <input type="email" id="contact" aria-invalid="true" aria-describedby="contact-error" required />
      <p id="contact-error">Geçerli bir e-posta adresi girin.</p>
    </form>
    <a href="/details">Konaklama ayrıntıları</a>
  </>;
}
