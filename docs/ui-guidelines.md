# UI kūrimo gairės

Šios gairės padeda išlaikyti vientisą naudotojo sąsajos stilių.

- Naudokite funkcinius React komponentus ir "hooks".
- Stiliams pirmenybę teikite paprastiems `style` atributams arba lengviems CSS failams.
- Atsisakykite sunkiasvorių UI bibliotekų, jei tai nėra būtina.
- Užtikrinkite prieinamumą: semantiniai HTML elementai, aiškūs kontrastai.
- Venkite bendrų globalių būsenų – naudokite lokalų `useState`; prireikus centralizuotos
  būsenos rinkitės lengvą sprendimą kaip `Zustand`.
- Dokumentuokite naujus komponentus `client/README.md` faile.
