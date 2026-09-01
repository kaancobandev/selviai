/**
 * Prompt kutusunun dönen ışık halkası.
 *
 * Katmanlar, kutunun içine içerikten ÖNCE yerleştirilir:
 *   1. dış hâle  — halkanın bulanık kopyası, kenardan biraz taşıyor
 *   2. halka     — net kenarlık; "şekil" hissini veren katman
 *   3. alt çubuk — alt kenarda süzülen ince ışık
 *
 * Neden iki ayrı dönen kare: bulanıklığı halkanın kendisine uygularsak kenar
 * kaybolur ve geriye yine bir bulut kalır. Bu yüzden net olan ile hâle olan
 * ayrı elemanlar; blur yalnızca kopyaya uygulanıyor.
 *
 * Görünümün tamamı CSS'te (app/globals.css, `.selvi-*`). Buradaki tek iş
 * doğru sırada üç boş katman koymak. Duraklatma, kutudaki
 * `data-hareket="durdu"` niteliğiyle yapılıyor — bu bileşen durum tutmuyor.
 */
export function PromptAurora({ cubuk = true }: { cubuk?: boolean }) {
  return (
    <>
      <div aria-hidden className="selvi-dis-hale">
        <div className="selvi-donen" />
      </div>
      <div aria-hidden className="selvi-halka">
        <div className="selvi-donen" />
      </div>
      {cubuk && <div aria-hidden className="selvi-cubuk" />}
    </>
  );
}
