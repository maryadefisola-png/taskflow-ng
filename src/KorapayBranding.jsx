import { useEffect } from "react"

function addKorapayIcon(button) {
  if (button.querySelector("[data-korapay-icon]")) return
  const icon = document.createElement("span")
  icon.dataset.korapayIcon = "true"
  icon.textContent = "K"
  Object.assign(icon.style, {
    width: "24px", height: "24px", borderRadius: "7px", display: "inline-grid",
    placeItems: "center", background: "#fff", color: "#15171a", fontSize: "13px",
    fontWeight: "900", marginRight: "8px", verticalAlign: "-2px", boxShadow: "0 1px 4px rgba(0,0,0,.12)"
  })
  button.prepend(icon)
}

export default function KorapayBranding() {
  useEffect(() => {
    const update = () => {
      document.querySelectorAll("button, p, div, span").forEach(el => {
        if (el.children.length === 0 && /Paystack/i.test(el.textContent || "")) {
          el.textContent = el.textContent.replace(/Paystack/gi, "Korapay")
        }
      })
      document.querySelectorAll("button").forEach(button => {
        if (/deposit with korapay/i.test(button.textContent || "")) addKorapayIcon(button)
      })
    }
    update()
    const observer = new MutationObserver(update)
    observer.observe(document.body, { childList: true, subtree: true, characterData: true })
    return () => observer.disconnect()
  }, [])
  return null
}
