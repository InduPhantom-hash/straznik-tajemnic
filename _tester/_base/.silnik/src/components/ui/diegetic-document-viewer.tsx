import FC, { FC as ReactFC } from 'react';
import { EquipmentItem, Character } from '@/lib/types';
import { inferDocumentType } from '@/lib/acquired-equipment';
import { User, FileText, Stamp, Award, Shield } from 'lucide-react';

interface DiegeticDocumentViewerProps {
  item: EquipmentItem;
  character?: Character | null;
}

export const DiegeticDocumentViewer: ReactFC<DiegeticDocumentViewerProps> = ({
  item,
  character,
}) => {
  const docType = item.documentType || inferDocumentType(item);
  const content = item.readableContent || item.description || 'Brak zapisanej treści...';

  // === 1. LEGITYMACJA PRASOWA / DOWÓD TOŻSAMOŚCI ===
  if (docType === 'press_pass' || docType === 'id_card') {
    const isPress = docType === 'press_pass';
    return (
      <div className="relative my-3 p-5 bg-[#d9cbb0] text-[#241a12] border-4 border-[#5c4a35] shadow-2xl rounded-sm font-serif select-text overflow-hidden">
        {/* Deseń tła paszportowego */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#423121_1px,transparent_1px)] [background-size:8px_8px] pointer-events-none" />

        {/* Nagłówek instytucji */}
        <div className="relative border-b-2 border-[#5c4a35] pb-2 mb-4 text-center">
          <div className="text-[10px] font-special-elite uppercase tracking-[0.25em] text-[#6e5840]">
            {isPress ? 'Legitymacja Prasowa' : 'Dokument Tożsamości'}
          </div>
          <h4 className="font-bold text-lg md:text-xl uppercase tracking-wider text-[#3d2f21] mt-0.5">
            {isPress ? '„THE ARKHAM ADVERTISER”' : 'COMMONWEALTH OF MASSACHUSETTS'}
          </h4>
          <div className="text-[11px] italic text-[#544332]">
            {isPress ? 'French Hill & College Streets, Arkham, Mass.' : 'Departament Stanu i Bezpieczeństwa Publicznego'}
          </div>
        </div>

        {/* Treść z portretem */}
        <div className="relative flex flex-col sm:flex-row gap-4 items-start">
          {/* Zdjęcie z spinaczem */}
          <div className="relative flex-none mx-auto sm:mx-0 transform -rotate-1 shadow-md">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-3.5 h-7 bg-zinc-400 rounded-full border-2 border-zinc-600 z-20"></div>
            <div className="w-24 h-28 bg-[#c2b397] border-4 border-white overflow-hidden flex items-center justify-center sepia-[0.3]">
              {character?.portraitUrl ? (
                <img
                  src={character.portraitUrl}
                  alt={character.name}
                  className="w-full h-full object-cover grayscale contrast-125"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-[#735e47]">
                  <User className="w-10 h-10 stroke-[1.5]" />
                  <span className="text-[9px] font-special-elite uppercase tracking-wider mt-1">
                    FOTO
                  </span>
                </div>
              )}
            </div>
            {/* Pieczęć nakładana na zdjęcie */}
            <div className="absolute -bottom-2 -right-2 w-12 h-12 rounded-full border-2 border-[#8b0000]/60 flex items-center justify-center text-[8px] font-bold text-[#8b0000]/70 transform -rotate-12 pointer-events-none select-none">
              <span className="text-center leading-tight">OFFICIAL<br/>SEAL</span>
            </div>
          </div>

          {/* Dane i Treść */}
          <div className="flex-1 text-sm leading-relaxed font-serif">
            <div className="mb-2 pb-1 border-b border-[#a8987d]/50 font-special-elite text-xs flex justify-between">
              <span>NRO: <strong className="text-[#3d2f21]">418/24</strong></span>
              <span>WAŻNE DO: <strong className="text-[#3d2f21]">31.XII.1926 r.</strong></span>
            </div>
            <p className="italic text-[#291e14] whitespace-pre-line">
              {content}
            </p>
          </div>
        </div>

        {/* Podpis redaktora / szeryfa */}
        <div className="relative mt-4 pt-2 border-t border-[#a8987d] flex justify-between items-end text-xs font-special-elite text-[#524131]">
          <div>
            <span>Status: </span>
            <span className="uppercase font-bold text-[#8b0000]">Uprawniony</span>
          </div>
          <div className="text-right">
            <div className="font-serif italic text-sm text-[#2b1f15] font-bold">
              [-] Arthur Pendelton
            </div>
            <div className="text-[10px] text-[#6b5643]">Redaktor Naczelny / Wydawca</div>
          </div>
        </div>
      </div>
    );
  }

  // === 2. TECZKA / KOPERTA NA DOWODY POLICYJNE ===
  if (docType === 'evidence_envelope') {
    return (
      <div className="relative my-3 p-6 bg-[#c7b28b] text-[#241a10] border-2 border-[#695439] shadow-2xl rounded-none font-special-elite select-text">
        {/* Zagięcia i sznurki teczki */}
        <div className="absolute top-3 right-4 w-6 h-6 rounded-full bg-[#8c352b] border-2 border-[#57201a] shadow-inner flex items-center justify-center text-white text-[10px] font-bold">
          ★
        </div>

        <div className="border-2 border-dashed border-[#57442d] p-4 bg-[#d1c09d]/60">
          <div className="flex justify-between items-start border-b-2 border-[#453623] pb-2 mb-3">
            <div>
              <h4 className="font-bold text-base md:text-lg uppercase tracking-wider text-[#362a1b]">
                DEPARTAMENT POLICJI W BOSTONIE
              </h4>
              <div className="text-xs uppercase tracking-widest text-[#5c4933]">
                BIURO DOWODÓW RZECZOWYCH & TAJNYCH AKTA
              </div>
            </div>
            <div className="text-right text-xs">
              <div>SPRAWA NR: <strong className="text-[#731911]">412/1924</strong></div>
              <div>DEPOZYT: <strong className="text-[#362a1b]">SEKTOR B</strong></div>
            </div>
          </div>

          <div className="font-serif italic text-sm md:text-base leading-relaxed text-[#1f160e] my-3 whitespace-pre-line">
            {content}
          </div>

          <div className="mt-4 pt-2 border-t border-[#6b5438] flex flex-wrap justify-between text-xs text-[#4a3926] gap-2">
            <div>Zabezpieczył: <strong>Det. M. Callahan</strong></div>
            <div>Status: <strong className="text-[#8c2318] uppercase">Dowód Koronny</strong></div>
          </div>
        </div>
      </div>
    );
  }

  // === 3. OFICJALNE PISMO RZĄDOWE / URZĘDOWE ===
  if (docType === 'official_document') {
    return (
      <div className="relative my-3 p-7 bg-[#ede4ce] text-[#1c150e] border border-[#a39474] shadow-2xl rounded-sm font-serif select-text">
        {/* Ślepa pieczęć urzędowa */}
        <div className="absolute top-6 right-6 w-16 h-16 rounded-full border-4 border-double border-[#8a7653]/40 flex items-center justify-center pointer-events-none select-none">
          <Shield className="w-8 h-8 text-[#8a7653]/30" />
        </div>

        <div className="text-center border-b border-[#a8997c] pb-3 mb-4">
          <div className="text-[10px] font-special-elite uppercase tracking-[0.3em] text-[#6b583e]">
            URZĄD MARSZAŁKOWSKI / SEKRETARIAT STANOWY
          </div>
          <h4 className="font-bold text-lg md:text-xl uppercase tracking-widest text-[#2e2216] mt-1">
            PISMO URZĘDOWE NR 89/B
          </h4>
        </div>

        <div className="text-sm md:text-base leading-relaxed text-[#1f170f] whitespace-pre-line my-4">
          {content}
        </div>

        <div className="mt-6 pt-3 border-t border-[#a8997c] flex justify-between items-end text-xs font-special-elite text-[#544331]">
          <div>Pieczęć Nagłówkowa: <strong className="text-[#2e2216]">ZATWIERDZONO</strong></div>
          <div className="text-right">
            <div className="font-serif italic font-bold text-base text-[#1c150e]">
              [-] Inspector General
            </div>
          </div>
        </div>
      </div>
    );
  }

  // === 4. GAZETA / WYCINEK PRASOWY ===
  if (docType === 'newspaper') {
    return (
      <div className="relative my-3 p-5 bg-[#e3d8c1] text-[#1a140e] border border-[#78664e] shadow-xl font-serif select-text">
        <div className="border-b-4 border-double border-[#3b3022] text-center pb-2 mb-3">
          <div className="text-[10px] font-special-elite uppercase tracking-widest text-[#5c4a35]">
            WYCINEK PRASOWY • EDITION SPECIAL
          </div>
          <h4 className="font-extrabold text-xl md:text-2xl uppercase tracking-tight text-[#211810]">
            THE ARKHAM DAILY GAZETTE
          </h4>
        </div>
        <div className="text-sm md:text-base leading-relaxed italic text-[#261d15] whitespace-pre-line font-serif">
          {content}
        </div>
      </div>
    );
  }

  // === 5. DEFAULT / LIST OSOBISTY / PAMIĘTNIK ===
  return (
    <div className="relative my-3 p-6 bg-[#ebdfc6] text-[#2c1d11] shadow-inner border border-[#d3c29e] rounded-sm font-serif text-sm md:text-base leading-relaxed select-text">
      {/* Znaczek pocztowy w rogu dla listów */}
      <div className="absolute top-3 right-3 w-10 h-12 border-2 border-dashed border-[#8c765c] bg-[#d9c7a7] flex flex-col items-center justify-center text-[9px] font-special-elite text-[#5c4934]">
        <span>USA</span>
        <span className="font-bold">2¢</span>
      </div>

      <span className="block text-xs font-special-elite text-[#5c4a37] uppercase tracking-wider mb-2 opacity-70">
        📜 Treść Dokumentu
      </span>
      <div className="whitespace-pre-line italic text-[#24170d] pr-6">
        {content}
      </div>
    </div>
  );
};
