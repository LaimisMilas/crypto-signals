# Page snapshot

```yaml
- generic [ref=e1]:
  - banner [ref=e3]:
    - link "⚡️ Crypto Signals" [ref=e5] [cursor=pointer]:
      - /url: /index.html
    - navigation [ref=e6]:
      - link "Live" [ref=e7] [cursor=pointer]:
        - /url: /live.html
      - link "Analytics" [ref=e8] [cursor=pointer]:
        - /url: /analytics.html
      - link "Portfolio" [ref=e9] [cursor=pointer]:
        - /url: /portfolio.html
      - link "Settings" [ref=e10] [cursor=pointer]:
        - /url: /settings.html
  - navigation "Breadcrumb" [ref=e11]:
    - list [ref=e12]
  - main [ref=e13]:
    - tablist [ref=e14]:
      - tab "Overview" [ref=e15]
      - tab "Trades" [active] [selected] [ref=e16]
    - tabpanel [ref=e17]
  - contentinfo [ref=e19]:
    - generic [ref=e20]:
      - text: "Version:"
      - generic [ref=e21]: loading…
    - generic [ref=e22]: •
    - link "GitHub" [ref=e23] [cursor=pointer]:
      - /url: https://github.com/your-org/crypto-signals
```