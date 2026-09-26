# Smart Dice BLE Bridge (Hardware Bridge dla kości elektronicznych Bluetooth)

## Status
Wdrożony moduł sprzętowy w `_tester/_base/.silnik/src/lib/hardware/` (Issue #377, powiązany z Epic #369).

---

## 1. Cel i Koncepcja Fiction First

Wprowadzenie opcjonalnego kontrolera fizycznego: zamiast klikać wirtualną tackę, badacz rzuca prawdziwą kością elektroniczną na stół. Wynik rzutu jest odczytywany w czasie rzeczywistym przez protokół Bluetooth Low Energy (GATT / Web Bluetooth API) i przekazywany bezpośrednio do silnika mechaniki gry według rygorystycznych zasad **Call of Cthulhu 7e RAW**.

---

## 2. Obsługiwane Standardy Sprzętowe

1. **Pixels Dice (Systemic Games):**
   - Pełen zestaw wielościanów: d4, d6, d8, d10, d12, d20, d100.
   - Usługa: **Nordic UART Service (NUS)**: `6e400001-b5a3-f393-e0a9-e50e24dcca9e`.
   - TX / Notify: `6e400003-b5a3-f393-e0a9-e50e24dcca9e`.
   - RX / Write: `6e400002-b5a3-f393-e0a9-e50e24dcca9e`.
   - Struktura pakietu:
     - Bajt 0: Typ komunikatu (`0x03` = RollState, `0x02` = IAmARoll, `0x07` = BatteryLevel).
     - Bajt 1: Stan kości (`1` = handling, `2` = rolling, `3` = onFace, `4` = crooked).
     - Bajt 2: Indeks ścianki (0-indexed; mapowany do kanonicznej wartości d100 Weird Fiction).

2. **GoDice (Particula):**
   - Kości z akcelerometrem i detekcją orientacji.
   - Usługa GATT z notyfikacją na zmianę stanu.
   - Struktura pakietu:
     - Znak `'R'` (`0x52`): kość w locie (stan `rolling`).
     - Znak `'S'` (`0x53`): stan stabilny (`onFace`), kolejny bajt to wartość ścianki.

---

## 3. Architektura i Przepływ Danych (Data Flow)

```
[Fizyczna Kość BLE] (Pixels / GoDice)
        │
        ▼ (GATT Notifications)
[SmartDiceBridge] (src/lib/hardware/smart-dice-bridge.ts)
        │
        ├─ 1. Walidacja autorytatywna (validateFaceValue: zakresy 1..max)
        ├─ 2. Detekcja stanu (handling / rolling / onFace)
        │
        ▼ (onRoll listener)
[DiceRollTrace Transformer] (toDiceRollTrace)
        │
        ├─ d100: rozbicie na kość dziesiątek i jedności
        ├─ d6 / d20 / inne: zachowanie identyfikatora i roli kości
        │
        ▼
[Kalkulator Reguł d100 Weird Fiction] (DiceDialog / OpposedMeleeCard / SkillTestResolver)
        │
        ▼ (W razie utraty połączenia lub braku wsparcia BLE)
[Fallback: Wirtualna Tacka 3D] (PhysicalDiceScene - Three.js + CANNON-ES)
```

---

## 4. Zasada Autorytatywności (Authoritative Engine)

Zgodnie z inwariantami projektu:
- Fizyczna kość BLE jest wyłącznie zewnętrznym czujnikiem (input device).
- Silnik gry (`SmartDiceBridge` & CoC 7e calculators) autorytatywnie weryfikuje poprawność wartości (clamp 1..max, ochrona przed zaciętą kością w stanie `crooked` lub ujemnymi bajtami).
- Modyfikatory, kości premiowe/karne, Szczęście (Luck) oraz progi sukcesu są kalkulowane niezmiennie przez reguły d100 Weird Fiction.

---

## 5. Przezroczysty Fallback (Graceful Degradation)

- Jeśli przeglądarka lub środowisko nie obsługuje Web Bluetooth API (`shouldFallbackToVirtual() === true`), system bezbłędnie i bez przestojów korzysta z procedury wirtualnej tacki 3D `PhysicalDiceScene`.
- Zerwanie połączenia w trakcie rzutu nie powoduje zablokowania rozgrywki; gracz ma zawsze możliwość dokończenia rzutu w interfejsie.
