import React, { useState, useMemo, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, ScatterChart, Scatter, ZAxis, LabelList
} from 'recharts';
import { 
  LayoutDashboard, 
  Leaf, 
  Zap, 
  ShieldCheck, 
  ChevronDown, 
  Search, 
  ExternalLink, 
  Info,
  ArrowUpRight,
  ArrowDownRight,
  X,
  Target,
  FileText,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from './utils';
import { SustainabilityData, YearData, BasicModule, ExtendedModule, MaterialityData, MaterialityItem } from './types';
import xbrlReport from './Fokuna_2025_XBRL_Report.json';
import { xbrlJsonToSustainabilityData } from './adapters/xbrlJsonToDashboard';

// Load all data_*.json files from the src directory
const dataFiles = import.meta.glob('./data_*.json', { eager: true });
const materialityFiles = import.meta.glob('./materiality_*.json', { eager: true });

// Aggregate all data
const aggregatedData: SustainabilityData = (() => {
  const files = Object.values(dataFiles) as { default: SustainabilityData }[];
  const mFiles = Object.values(materialityFiles) as { default: MaterialityData }[];
  
  if (files.length === 0) return {} as SustainabilityData;

  // Use the first file as the base for company and modules
  const base = files[0].default;
  const allYears: YearData[] = [];
  
  files.forEach(file => {
    if (file.default.years) {
      file.default.years.forEach(y => {
        if (!allYears.find(existing => existing.year === y.year)) {
          allYears.push(y);
        }
      });
    }
  });

  // Aggregate materiality
  const allMateriality: MaterialityData[] = mFiles.map(f => f.default);

  // Sort years
  allYears.sort((a, b) => a.year - b.year);

  let finalData: SustainabilityData = {
    ...base,
    years: allYears,
    materiality: allMateriality
  };

  if (xbrlReport) {
    finalData = xbrlJsonToSustainabilityData(xbrlReport as any, finalData);
  }

  return finalData;
})();

function FokunaLogo({ className = "h-10" }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div className="w-8 h-8 bg-neon-green rounded-lg flex items-center justify-center">
        <LayoutDashboard className="text-black w-5 h-5" />
      </div>
    </div>
  );
}

function InfoTooltip({ 
  method, 
  basis, 
  factorSource,
  exactValue
}: { 
  method?: string, 
  basis?: string, 
  factorSource?: string,
  exactValue?: string
} = {}) {
  const [isVisible, setIsVisible] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (isVisible && anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      const tooltipWidth = window.innerWidth < 640 ? 280 : 320;
      const padding = 12;
      
      let left = rect.right - tooltipWidth;
      let top = rect.bottom + 8;

      // Ensure it doesn't go off-screen left
      if (left < padding) {
        left = padding;
      }
      // Ensure it doesn't go off-screen right
      if (left + tooltipWidth > window.innerWidth - padding) {
        left = window.innerWidth - tooltipWidth - padding;
      }
      // Ensure it doesn't go off-screen bottom
      if (top + 200 > window.innerHeight) { // 200 is approx height
        top = rect.top - 200 - 8;
      }

      setPos({ top, left });
    }
  }, [isVisible]);

  return (
    <div className="relative inline-block">
      <button
        ref={anchorRef}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={(e) => {
          e.stopPropagation();
          setIsVisible(!isVisible);
        }}
        className="text-white/40 hover:text-white/80 transition-colors p-1 flex items-center justify-center"
        aria-label="Lisätietoja"
      >
        <Info className="w-4 h-4" />
      </button>
      {createPortal(
        <AnimatePresence>
          {isVisible && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              style={{
                position: 'fixed',
                top: pos.top,
                left: pos.left,
                zIndex: 10000,
              }}
              className="w-[280px] sm:w-[320px] bg-black/95 border border-white/10 p-4 rounded-xl shadow-2xl pointer-events-none"
            >
              <div className="text-xs text-white/80 leading-relaxed space-y-4 font-sans">
                {method && (
                  <div>
                    <p className="font-bold text-white mb-1 uppercase tracking-widest text-[10px]">Menetelmä:</p>
                    <p className="min-h-[1em]">{method}</p>
                  </div>
                )}
                {basis && (
                  <div>
                    <p className="font-bold text-white mb-1 uppercase tracking-widest text-[10px]">Peruste:</p>
                    <p className="min-h-[1em]">{basis}</p>
                  </div>
                )}
                {factorSource && (
                  <div>
                    <p className="font-bold text-white mb-1 uppercase tracking-widest text-[10px]">Lähde / Kerroin:</p>
                    <p className="min-h-[1em]">{factorSource}</p>
                  </div>
                )}
                {exactValue && (
                  <div>
                    <p className="font-bold text-white mb-1 uppercase tracking-widest text-[10px]">Tarkka arvo:</p>
                    <p className="min-h-[1em] font-mono text-neon-green">{exactValue}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

function MaterialityScatter({ items, activeId, title }: { items: MaterialityItem[], activeId: string, title?: string }) {
  const data = items.filter(item => item.id !== 'C9'); // Filter out "Ei sovellu"
  const others = data.filter(item => item.id !== activeId);
  const activeItem = data.find(item => item.id === activeId);
  
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-black/90 border border-white/10 p-3 rounded-lg shadow-xl">
          <p className="text-xs font-bold text-neon-green mb-1">{item.id}: {item.materiality_topic}</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
            <span className="text-white/40">Vaikutus (ihmiset ja ympäristö):</span>
            <span className="text-white font-mono">{item.impact}</span>
            <span className="text-white/40">Taloudellinen:</span>
            <span className="text-white font-mono">{item.financial}</span>
            <span className="text-white/40">Sidosryhmä:</span>
            <span className="text-white font-mono">{item.stakeholder}</span>
          </div>
          <p className="mt-2 text-[10px] uppercase tracking-widest font-bold text-white/60">
            Luokitus: <span className="text-neon-green">{item.classification}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-full w-full bg-black/20 rounded-xl border border-white/5 p-6 flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h4 className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1">Olennaisuusarviointi</h4>
          <p className="text-xs text-white/60">{title}</p>
        </div>
        <div className="flex items-center gap-4 text-[9px] text-white/30">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-neon-green" />
            <span>Valittu</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-white/20" />
            <span>Muut</span>
          </div>
        </div>
      </div>
      <div className="flex-1 min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />

            <XAxis 
              type="number" 
              dataKey="impact" 
              name="Impact" 
              domain={[0, 5]} 
              stroke="#666" 
              fontSize={10}
            />
            <YAxis 
              type="number" 
              dataKey="financial" 
              name="Financial" 
              domain={[0, 5]} 
              stroke="#666" 
              fontSize={10}
            />
            <ZAxis type="number" dataKey="stakeholder" range={[100, 800]} name="Stakeholder" />
            <Tooltip content={<CustomTooltip />} />
            
            {/* Background points */}
            <Scatter name="Others" data={others} fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.3)" />
            
            {/* Active point (rendered last to be on top) */}
            {activeItem && (
              <Scatter name="Active" data={[activeItem]} fill="#39ff14" stroke="#39ff14" strokeWidth={2}>
                <Cell className="animate-pulse" />
              </Scatter>
            )}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function App() {
  const appData = aggregatedData;
  const years = useMemo(() => appData.years || [], [appData]);

  const [selectedYear, setSelectedYear] = useState<number>(years.length > 0 ? years[years.length - 1].year : 2025);
  const [comparisonYear, setComparisonYear] = useState<number>(years.length > 1 ? years[years.length - 2].year : 2024);
  const [showComparison, setShowComparison] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState<BasicModule | ExtendedModule | null>(null);
  const [isMaterialityOpen, setIsMaterialityOpen] = useState(false);
  const [showApplicabilityTooltip, setShowApplicabilityTooltip] = useState(false);
  const applicabilityAnchorRef = useRef<HTMLDivElement>(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0, placement: 'right' });
  const [showTechnicalAppendix, setShowTechnicalAppendix] = useState(false);

  useLayoutEffect(() => {
    if (showApplicabilityTooltip && applicabilityAnchorRef.current) {
      const rect = applicabilityAnchorRef.current.getBoundingClientRect();
      const tooltipWidth = 256; // w-64 = 16rem = 256px
      const tooltipHeight = 160; // approximate height
      const padding = 12;

      let top = rect.top + rect.height / 2 - tooltipHeight / 2;
      let left = rect.right + padding;
      let placement = 'right';

      // Check right space
      if (left + tooltipWidth > window.innerWidth) {
        left = rect.left - tooltipWidth - padding;
        placement = 'left';
      }

      // Check left space (if it was flipped to left and still doesn't fit)
      if (placement === 'left' && left < 0) {
        // Fallback to top or bottom if both sides fail
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        top = rect.top - tooltipHeight - padding;
        placement = 'top';
      }

      // Check top space
      if (placement === 'top' && top < 0) {
        top = rect.bottom + padding;
        placement = 'bottom';
      }

      // Final viewport containment for horizontal
      left = Math.max(padding, Math.min(window.innerWidth - tooltipWidth - padding, left));
      // Final viewport containment for vertical
      top = Math.max(padding, Math.min(window.innerHeight - tooltipHeight - padding, top));

      setTooltipPos({ top, left, placement });
    }
  }, [showApplicabilityTooltip]);

  const currentYearMateriality = useMemo(() => {
    return appData.materiality?.find(m => m.year === selectedYear)?.items || [];
  }, [appData.materiality, selectedYear]);

  const currentYearData = useMemo(() => {
    return years.find(y => y.year === selectedYear) || years[0];
  }, [selectedYear, years]);

  const previousYearData = useMemo(() => {
    return years.find(y => y.year === comparisonYear) || null;
  }, [comparisonYear, years]);

  const calculateDelta = (current: number, previous: number | undefined) => {
    if (previous === undefined || previous === 0) return null;
    const delta = ((current - previous) / previous) * 100;
    return delta;
  };

  const chartData = useMemo(() => {
    return years.map(y => {
      const kpi = y.kpi;
      return {
        year: y.year,
        sähkö: kpi.electricity_kwh,
        sähkö_mwh: kpi.electricity_kwh / 1000,
        scope2: kpi.scope2_kg,
        scope3: kpi.scope3_kg_raw || 0,
        factor: kpi.emissionFactor_g_per_kwh
      };
    });
  }, [years]);

  const filteredBasicModules = useMemo(() => {
    return (appData?.modules?.basic || []) as BasicModule[];
  }, [appData]);

  const filteredExtendedModules = useMemo(() => {
    const base = (appData?.modules?.extended || []) as ExtendedModule[];
    return base.filter(m => 
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      m.details.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, appData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'raportoitu': return 'bg-neon-green/20 text-neon-green border-neon-green/30';
      case 'vähäinen': return 'bg-neon-orange/20 text-neon-orange border-neon-orange/30';
      default: return 'bg-white/10 text-white/60 border-white/10';
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg text-white selection:bg-neon-green selection:text-black">
      {/* Header / Hero */}
      <header className="border-b border-white/5 bg-card-bg/50 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <FokunaLogo className="w-10 h-10" />
              <h1 className="text-xl font-bold tracking-tight">
                {appData?.company?.name || 'Fokuna'} <span className="text-white/40 font-normal">— Vastuullisuusraportti (VSME)</span>
              </h1>
            </div>
            <p className="text-sm text-white/60 ml-13">
              Raportointikausi: <span className="text-white">{currentYearData?.reportingPeriod}</span>
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-black/40 p-1 rounded-lg border border-neon-green/30">
              <span className="text-[10px] uppercase tracking-tighter text-neon-green/60 ml-2">Vuosi</span>
              <select 
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-card-bg text-sm font-medium px-3 py-1.5 focus:outline-none cursor-pointer rounded-md border border-white/5"
              >
                {years.map(y => (
                  <option key={y.year} value={y.year} className="bg-card-bg text-white">{y.year}</option>
                ))}
              </select>
            </div>

            {showComparison && (
              <div className="flex items-center gap-2 bg-black/40 p-1 rounded-lg border border-neon-green/30">
                <span className="text-[10px] uppercase tracking-tighter text-neon-green/60 ml-2">Vertaa</span>
                <select 
                  value={comparisonYear}
                  onChange={(e) => setComparisonYear(Number(e.target.value))}
                  className="bg-card-bg text-sm font-medium px-3 py-1.5 focus:outline-none cursor-pointer text-white rounded-md border border-white/5"
                >
                  {years.map(y => (
                    <option key={y.year} value={y.year} className="bg-card-bg text-white" disabled={y.year === selectedYear}>
                      {y.year}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button 
              onClick={() => setShowComparison(!showComparison)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border",
                showComparison 
                  ? "bg-neon-green text-black border-neon-green" 
                  : "bg-white/5 text-white/80 border-white/10 hover:border-white/30"
              )}
            >
              {showComparison ? "Vertailu päällä" : "Näytä vertailu"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        
        {/* Company Info Section */}
        <section className="bg-card-bg rounded-2xl p-8 border border-white/5 shadow-xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-bold tracking-tight mb-6 flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-neon-green" />
                Yrityksen tiedot
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-12">
                <InfoItem label="Yrityksen nimi" value={appData.company.name} />
                <div className="flex flex-col">
                  <h4 className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1">Y-tunnus</h4>
                  <a 
                    href={`https://tietopalvelu.ytj.fi/yritys/${appData.company.businessId}`} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-sm font-medium text-neon-green hover:underline flex items-center gap-1"
                  >
                    {appData.company.businessId}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <InfoItem label="Toimiala" value={appData.company.industry} />
                <InfoItem label="Yhtiömuoto" value={appData.company.ownerForm} />
                <InfoItem label="Sijainti" value={appData.company.location} />
                <InfoItem label="Henkilöstö" value={`${appData.company.entrepreneur || 0} yrittäjä, ${appData.company.employees || 0} työntekijää`} />
                <div className="sm:col-span-2">
                  <InfoItem label="Liikevaihto" value={appData.company.revenue} />
                </div>
              </div>
            </div>
            
            <div className="bg-black/20 rounded-xl p-6 border border-white/5">
              <h3 className="text-sm uppercase tracking-widest text-white/40 font-bold mb-4">Palvelut</h3>
              <ul className="space-y-2">
                {appData.company.services?.map((service, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-white/80">
                    <div className="w-1.5 h-1.5 rounded-full bg-neon-green mt-1.5 flex-shrink-0" />
                    {service}
                  </li>
                ))}
              </ul>
              <div className="mt-8 pt-6 border-t border-white/5 space-y-3">
                <h3 className="text-sm uppercase tracking-widest text-white/40 font-bold mb-2">Yhteystiedot</h3>
                <a href={appData.company.contact.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs text-neon-green hover:underline">
                  <ExternalLink className="w-3 h-3" /> {appData.company.contact.website?.replace('https://', '')}
                </a>
                <a href={`mailto:${appData.company.contact.email}`} className="text-xs text-neon-green hover:underline flex items-center gap-2 transition-colors">
                  <Info className="w-3 h-3" /> {appData.company.contact.email}
                </a>
                <p className="text-xs text-white/60 flex items-center gap-2">
                  <Info className="w-3 h-3" /> {appData.company.contact.phone}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* KPI Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard 
            title="Scope 1 – Suorat päästöt" 
            value={`${((currentYearData?.kpi?.scope1_kg || 0) / 1000).toFixed(2)} tCO2e`}
            icon={<Leaf className="w-5 h-5" />}
            delta={showComparison ? calculateDelta(currentYearData?.kpi?.scope1_kg || 0, previousYearData?.kpi?.scope1_kg) : null}
            info={
              <InfoTooltip 
                method="Suorat kasvihuonekaasupäästöt (Scope 1) GHG Protocol -viitekehyksen mukaisesti." 
                basis="Yrityksellä ei ollut raportointikaudella polttoaineen polttoa, tuotantoprosesseja eikä omistettuja ajoneuvoja, joista syntyisi suoria päästöjä."
                factorSource="Ei sovellettavia päästölähteitä raportointikaudella."
              />
            }
          />
          <KPICard 
            title="Scope 2 – Ostoenergia" 
            value={`${((currentYearData?.kpi?.scope2_kg || 0) / 1000).toFixed(2)} tCO2e`}
            icon={<Leaf className="w-5 h-5" />}
            delta={showComparison ? calculateDelta(currentYearData?.kpi?.scope2_kg || 0, previousYearData?.kpi?.scope2_kg) : null}
            info={
              <InfoTooltip 
                method="Sijaintiperusteinen laskenta GHG Protocolin mukaisesti." 
                basis={`Sähkönkulutus (${currentYearData?.kpi?.electricity_kwh_raw?.toLocaleString('fi-FI', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || 0} kWh) × ${currentYearData?.kpi?.emissionFactor_g_per_kwh || 26} gCO2/kWh.`}
                factorSource="Fingrid, Suomessa kulutetun sähkön päästökerroin (26 gCO₂/kWh). Viitattu 2.3.2026."
                exactValue={currentYearData?.kpi?.scope2_kg_raw 
                  ? `${currentYearData.kpi.scope2_kg_raw.toLocaleString('fi-FI', { minimumFractionDigits: 0, maximumFractionDigits: 1 })} kg CO2e (= ${currentYearData.kpi.scope2_t_raw?.toLocaleString('fi-FI', { minimumFractionDigits: 0, maximumFractionDigits: 4 })} tCO2e)` 
                  : undefined}
              />
            }
          />
          <KPICard 
            title="Scope 3 – Arvoketjun päästöt" 
            value={currentYearData?.kpi?.scope3_kg_raw && currentYearData.kpi.scope3_kg_raw > 0 
              ? `${(currentYearData.kpi.scope3_kg_raw / 1000).toFixed(2)} tCO2e` 
              : (currentYearData?.kpi?.scope3_status || 'Ei raportoitu')}
            subtitle={currentYearData?.kpi?.scope3_kg_raw && currentYearData.kpi.scope3_kg_raw > 0 ? currentYearData.kpi.scope3_status : undefined}
            icon={<Leaf className="w-5 h-5" />}
            info={
              <InfoTooltip 
                method="Scope 3 -päästöt on koottu yrityskohtaisena arviona raportointikauden aikana hankituista liiketoiminnan käyttöön tarkoitetuista pääomahyödykkeistä." 
                basis="Mukana ovat Samsung Galaxy Book5 Pro 14 -kannettava ja Logitech MX Master 4 -hiiri."
                factorSource="Samsung Galaxy Book5 Pro 14 -kannettavan valmistajan julkaisema elinkaariarvio (LCA): 240.0 kg CO2e. Logitech MX Master 4 -hiiren arvio perustuu Logitech MX Master 3S Bluetooth Edition -mallin julkaistuun hiilijalanjälkitietoon 7.78 kg CO2e, jota käytetään proxy-arvona, koska täsmällisen MX Master 4 -mallin tuotekohtaista lukua ei ollut saatavilla raportointiajankohtana."
                exactValue={currentYearData?.kpi?.scope3_kg_raw 
                  ? `${(currentYearData.kpi.scope3_kg_raw / 1000).toFixed(2)} tCO2e` 
                  : undefined}
              />
            }
          />
          <KPICard 
            title="Sähkönkulutus (ostoenergia)" 
            value={`${((currentYearData?.kpi?.electricity_kwh || 0) / 1000).toFixed(2)} MWh`}
            icon={<Zap className="w-5 h-5" />}
            delta={showComparison ? calculateDelta(currentYearData?.kpi?.electricity_kwh || 0, previousYearData?.kpi?.electricity_kwh) : null}
            info={
              <InfoTooltip 
                method="Sähkönkulutuksen seuranta." 
                basis="Laskenta perustuu työssä käytettyjen laitteiden energiankäytön arvioon."
                exactValue={currentYearData?.kpi?.electricity_kwh_raw 
                  ? `${currentYearData.kpi.electricity_kwh_raw.toLocaleString('fi-FI', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kWh (= ${(currentYearData.kpi.electricity_kwh_raw / 1000).toLocaleString('fi-FI', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} MWh)`
                  : undefined}
              />
            }
          />
        </section>

        {/* Charts Section */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-card-bg rounded-2xl p-6 border border-white/5 shadow-xl relative z-10 hover:z-20 transition-all">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Zap className="w-5 h-5 text-[#39FF14]" />
                Sähkönkulutus (MWh)
              </h3>
              <div className="text-xs text-white/40 font-mono">VSME B3</div>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis 
                    dataKey="year" 
                    stroke="#666" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke="#666" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(val) => val.toFixed(2)}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }}
                    itemStyle={{ color: '#39FF14' }}
                    wrapperStyle={{ zIndex: 1000 }}
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    separator=": "
                    formatter={(value: number, _name: string, props: any) => [
                      `${value.toLocaleString('fi-FI', { maximumFractionDigits: 2 })} MWh (${Math.round(props.payload.sähkö).toLocaleString('fi-FI', { maximumFractionDigits: 0 })} kWh)`,
                      "Sähkönkulutus"
                    ]}
                  />
                  <Bar dataKey="sähkö_mwh" radius={[4, 4, 0, 0]}>
                    <LabelList 
                      dataKey="sähkö_mwh" 
                      position="top" 
                      formatter={(val: number) => val.toFixed(2)}
                      style={{ fill: '#39FF14', fontSize: 12, fontWeight: 500 }}
                    />
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.year === selectedYear ? '#39FF14' : '#145c07'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-card-bg rounded-2xl p-6 border border-white/5 shadow-xl relative z-10 hover:z-20 transition-all">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Leaf className="w-5 h-5 text-[#FF8A00]" />
                Scope 2 Päästöt (kg CO2e)
              </h3>
              <div className="flex items-center gap-3">
                <div className="text-xs text-white/40 font-mono">VSME B3</div>
                <InfoTooltip factorSource={currentYearData?.kpi?.source} />
              </div>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis 
                    dataKey="year" 
                    stroke="#666" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke="#666" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(val) => val.toFixed(1)}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }}
                    itemStyle={{ color: '#FF8A00' }}
                    wrapperStyle={{ zIndex: 1000 }}
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    separator=": "
                    formatter={(value: number) => [
                      `${value.toLocaleString('fi-FI', { maximumFractionDigits: 1 })} kg CO2e (${(value/1000).toLocaleString('fi-FI', { maximumFractionDigits: 4 })} tCO2e)`,
                      "Scope 2"
                    ]}
                  />
                  <Bar dataKey="scope2" radius={[4, 4, 0, 0]}>
                    <LabelList 
                      dataKey="scope2" 
                      position="top" 
                      formatter={(val: number) => val.toFixed(2)}
                      style={{ fill: '#FF8A00', fontSize: 12, fontWeight: 500 }}
                    />
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.year === selectedYear ? '#FF8A00' : '#7c3a00'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-card-bg rounded-2xl p-6 border border-white/5 shadow-xl relative z-10 hover:z-20 transition-all">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Leaf className="w-5 h-5 text-[#3B82F6]" />
                Scope 3 Päästöt (kg CO2e)
              </h3>
              <div className="flex items-center gap-3">
                <div className="text-xs text-white/40 font-mono">VSME B3</div>
              </div>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis 
                    dataKey="year" 
                    stroke="#666" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke="#666" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(val) => val.toFixed(0)}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }}
                    itemStyle={{ color: '#3B82F6' }}
                    wrapperStyle={{ zIndex: 1000 }}
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    separator=": "
                    formatter={(value: number) => [
                      `${value.toLocaleString('fi-FI', { maximumFractionDigits: 0 })} kg CO2e (${(value/1000).toLocaleString('fi-FI', { maximumFractionDigits: 2 })} tCO2e)`,
                      "Scope 3"
                    ]}
                  />
                  <Bar dataKey="scope3" radius={[4, 4, 0, 0]}>
                    <LabelList 
                      dataKey="scope3" 
                      position="top" 
                      formatter={(val: number) => val.toFixed(0)}
                      style={{ fill: '#3B82F6', fontSize: 12, fontWeight: 500 }}
                    />
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.year === selectedYear ? '#3B82F6' : '#1e40af'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* VSME Basic Modules */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">VSME perusmoduulit</h2>
              <p className="text-white/60 text-sm">Yleiset, ympäristö, sosiaalinen ja hallinto (B1–B11)</p>
            </div>
          </div>

          <div className="space-y-12">
            <ModuleGroup 
              title="Yleiset & Hallinto" 
              modules={filteredBasicModules.filter(m => m.group === 'yleinen' || m.group === 'hallinto')} 
              onSelect={(m) => {
                setSelectedModule(m);
                setShowApplicabilityTooltip(false);
              }}
              getStatusColor={getStatusColor}
            />
            <ModuleGroup 
              title="Ympäristö" 
              modules={filteredBasicModules.filter(m => m.group === 'ympäristö')} 
              onSelect={(m) => {
                setSelectedModule(m);
                setShowApplicabilityTooltip(false);
              }}
              getStatusColor={getStatusColor}
            />
            <ModuleGroup 
              title="Sosiaalinen" 
              modules={filteredBasicModules.filter(m => m.group === 'sosiaalinen')} 
              onSelect={(m) => {
                setSelectedModule(m);
                setShowApplicabilityTooltip(false);
              }}
              getStatusColor={getStatusColor}
            />
          </div>
        </section>

        {/* Extended Modules Accordion */}
        <section className="bg-card-bg rounded-2xl p-8 border border-white/5 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Laajennettu moduuli</h2>
              <p className="text-white/60 text-sm">Syventävät kestävyysaiheet (C1–C9)</p>
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input 
                type="text" 
                placeholder="Hae moduuleista..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-neon-green transition-colors"
              />
            </div>
          </div>

          <div className="space-y-4">
            {filteredExtendedModules.map(module => (
              <AccordionItem key={module.id} module={module} />
            ))}
            {filteredExtendedModules.length === 0 && (
              <div className="text-center py-12 text-white/40 italic">
                Ei hakutuloksia.
              </div>
            )}
          </div>
        </section>

        {/* Sources */}
        <footer className="pt-12 border-t border-white/5">
          <h3 className="text-lg font-semibold mb-6">Lähteet ja viitteet</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              ...(appData?.sources || []),
              ...(selectedYear === 2025 ? [
                {
                  name: "Samsung Galaxy Book5 Pro 14 (LCA)",
                  description: "Valmistajan julkaisema elinkaariarvio kannettavan tietokoneen päästötiedolle.",
                  url: "/sources/LCA_Results_for_Notebook.pdf"
                },
                {
                  name: "Logitech MX Master 3S proxy source",
                  description: "Arkistoitu valmistajalähde hiiren proxy-arviolle, 7.78 kg CO2e.",
                  url: "/sources/MX_Master_3S_Bluetooth_Edition_Wireless_Mouse.pdf"
                }
              ] : [])
            ].map((source, idx) => (
              <a 
                key={idx}
                href={source.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="group p-4 bg-white/5 rounded-xl border border-white/5 hover:border-neon-green/30 transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium group-hover:text-neon-green transition-colors">{source.name}</span>
                  <ExternalLink className="w-4 h-4 text-white/20 group-hover:text-neon-green" />
                </div>
                <p className="text-xs text-white/40">{source.description}</p>
              </a>
            ))}
          </div>
          <div className="mt-12 text-center text-neon-green text-xs font-medium opacity-60">
            © {new Date().getFullYear()} {appData?.company?.name || 'Fokuna'} — {appData?.company?.businessId} — {appData?.company?.location}
          </div>
        </footer>
      </main>

      {/* Module Detail Drawer */}
      <AnimatePresence>
        {selectedModule && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setSelectedModule(null);
                setShowApplicabilityTooltip(false);
              }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-card-bg border-l border-white/10 z-50 shadow-2xl overflow-y-auto"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-neon-green/10 rounded-xl flex items-center justify-center border border-neon-green/20">
                      <span className="text-neon-green font-bold text-sm">{selectedModule.id}</span>
                    </div>
                    <h2 className="text-xl font-bold">{selectedModule.title}</h2>
                  </div>
                  <button 
                    onClick={() => {
                      setSelectedModule(null);
                      setShowApplicabilityTooltip(false);
                    }}
                    className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                  >
                    <X className="w-6 h-6 text-white/40" />
                  </button>
                </div>

                <div className="space-y-8">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-xs uppercase tracking-widest text-white/40 font-semibold mb-3">Status</h4>
                      <span className={cn(
                        "px-3 py-1 rounded-full text-xs font-medium border inline-block",
                        getStatusColor(selectedModule.status)
                      )}>
                        {selectedModule.status.charAt(0).toUpperCase() + selectedModule.status.slice(1)}
                      </span>
                    </div>

                    <div 
                      ref={applicabilityAnchorRef}
                      className="relative cursor-help group/tooltip"
                      onMouseEnter={() => setShowApplicabilityTooltip(true)}
                      onMouseLeave={() => setShowApplicabilityTooltip(false)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowApplicabilityTooltip(!showApplicabilityTooltip);
                      }}
                    >
                      <h4 className="text-xs uppercase tracking-widest text-white/40 font-semibold mb-3 group-hover/tooltip:text-white/60 transition-colors">Sovellettavuus</h4>
                      <div className="flex items-center gap-2">
                        {[1, 2, 3].map((i) => {
                          const levels: Record<string, number> = { 'vähäinen': 1, 'kohtalainen': 2, 'korkea': 3 };
                          const isActive = i <= (levels[selectedModule.applicability] || 0);
                          return (
                            <div 
                              key={i} 
                              className={cn(
                                "h-1.5 w-6 rounded-full transition-all",
                                isActive ? "bg-neon-green" : "bg-white/10",
                                isActive && showApplicabilityTooltip ? "shadow-[0_0_8px_rgba(57,255,20,0.5)]" : ""
                              )} 
                            />
                          );
                        })}
                      </div>
                      {createPortal(
                        <AnimatePresence>
                          {showApplicabilityTooltip && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              style={{ 
                                position: 'fixed',
                                top: tooltipPos.top,
                                left: tooltipPos.left,
                                zIndex: 10000
                              }}
                              className="w-64 bg-black/95 border border-white/10 p-4 rounded-xl shadow-2xl pointer-events-none"
                            >
                              <p className="font-bold text-white mb-1 uppercase tracking-widest text-[10px]">Sovellettavuus</p>
                              <p className="text-xs text-white/60 leading-relaxed mb-3">
                                Kuvaa, kuinka hyvin tämä moduuli soveltuu yrityksen tilanteeseen ja raportointikauteen.
                              </p>
                              <div className="flex items-center justify-between border-t border-white/5 pt-2">
                                <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Taso</span>
                                <span className="text-xs font-mono text-neon-green font-bold">
                                  {(() => {
                                    const levels: Record<string, number> = { 'vähäinen': 1, 'kohtalainen': 2, 'korkea': 3 };
                                    return levels[selectedModule.applicability] || 0;
                                  })()}/3
                                </span>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>,
                        document.body
                      )}
                    </div>
                  </div>

                  {selectedModule.id !== 'B1' && selectedModule.id !== 'B2' && currentYearMateriality.length > 0 ? (
                    <button 
                      onClick={() => setIsMaterialityOpen(true)}
                      className="w-full flex items-center justify-center gap-2 py-4 bg-neon-green/10 border border-neon-green/20 rounded-xl text-neon-green font-bold text-sm hover:bg-neon-green/20 transition-all group"
                    >
                      <Target className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      Katso Olennaisuusarviointi
                    </button>
                  ) : (selectedModule.id === 'B1' || selectedModule.id === 'B2') && (
                    <div className="p-6 bg-white/5 rounded-xl border border-white/5 opacity-60">
                      <div className="flex items-center gap-3 mb-2">
                        <Target className="w-4 h-4 text-white/40" />
                        <h4 className="text-[10px] uppercase tracking-widest font-bold">Olennaisuusarviointi</h4>
                      </div>
                      <p className="text-xs leading-relaxed">
                        Tämä moduuli ({selectedModule.id}) on yleinen laatimisperuste, eikä se sisälly varsinaiseen olennaisuusarviointiin.
                      </p>
                    </div>
                  )}

                  <div>
                    <h4 className="text-xs uppercase tracking-widest text-white/40 font-semibold mb-3">Kuvaus</h4>
                    <p className="text-white/40 text-sm italic mb-4">
                      {selectedModule.description}
                    </p>
                    <div className="prose prose-invert prose-sm max-w-none">
                      <p className="text-white/80 leading-relaxed whitespace-pre-line">
                        {selectedModule.details}
                      </p>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-white/5">
                    <div className="p-4 bg-neon-green/5 rounded-xl border border-neon-green/10">
                      <p className="text-xs text-neon-green/80 italic">
                        Tämä moduuli on osa VSME-standardia, joka on suunniteltu auttamaan PK-yrityksiä kestävyysraportoinnin aloittamisessa.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Technical Appendix (XBRL) - Collapsible */}
      {selectedYear === 2025 && currentYearData?.disclosures && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-white/5">
          <button 
            onClick={() => setShowTechnicalAppendix(!showTechnicalAppendix)}
            className="flex items-center gap-3 text-white/40 hover:text-white transition-colors group"
          >
            <Info className={cn("w-5 h-5 transition-colors", showTechnicalAppendix ? "text-neon-green" : "group-hover:text-neon-green")} />
            <span className="text-sm font-semibold uppercase tracking-wider">Tekninen liite (XBRL)</span>
            <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", showTechnicalAppendix ? "rotate-180" : "")} />
          </button>

          <AnimatePresence>
            {showTechnicalAppendix && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="pt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Download Card */}
                  <div className="p-6 bg-card-bg border border-white/10 rounded-3xl flex flex-col justify-between group hover:border-neon-green/30 transition-all duration-500">
                    <div className="flex items-start gap-4 mb-6">
                      <div className="w-12 h-12 bg-neon-green/10 rounded-2xl flex items-center justify-center border border-neon-green/20 group-hover:scale-110 transition-transform duration-500">
                        <FileText className="text-neon-green w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold mb-2">Virallinen VSME-raportti (iXBRL)</h3>
                        <p className="text-sm text-white/60 leading-relaxed">
                          Tämä tiedosto sisältää koneluettavan XBRL-version raportista EFRAG VSME -taksonomian mukaisesti.
                        </p>
                      </div>
                    </div>
                    <a 
                      href="/xbrl/Fokuna_2025_XBRL_Report_viewer.html"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-4 bg-neon-green text-black font-bold rounded-2xl hover:bg-[#32e012] transition-all duration-300 shadow-[0_0_20px_rgba(57,255,20,0.2)] hover:shadow-[0_0_30px_rgba(57,255,20,0.4)]"
                    >
                      <Download className="w-5 h-5" />
                      Lataa raportti
                    </a>
                  </div>

                  {currentYearData.disclosures.general && (
                    <DisclosureCard title="Yleiset tiedot" content={currentYearData.disclosures.general} />
                  )}
                  {currentYearData.disclosures.environmental && (
                    <DisclosureCard title="Ympäristö" content={currentYearData.disclosures.environmental} />
                  )}
                  {currentYearData.disclosures.social && (
                    <DisclosureCard title="Sosiaalinen" content={currentYearData.disclosures.social} />
                  )}
                  {currentYearData.disclosures.governance && (
                    <DisclosureCard title="Hallinto" content={currentYearData.disclosures.governance} />
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      )}

      {/* Materiality Overlay */}
      <AnimatePresence>
        {isMaterialityOpen && selectedModule && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMaterialityOpen(false)}
              className="fixed inset-0 bg-black/90 backdrop-blur-md z-[60]"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="fixed inset-4 md:inset-20 bg-card-bg border border-white/10 z-[70] rounded-3xl shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-neon-green/10 rounded-xl flex items-center justify-center border border-neon-green/20">
                    <Target className="text-neon-green w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Olennaisuusarviointi</h2>
                    <p className="text-xs text-white/40">{selectedModule.title}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsMaterialityOpen(false)}
                  className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                >
                  <X className="w-8 h-8 text-white/40" />
                </button>
              </div>
              <div className="flex-1 p-8">
                <MaterialityScatter 
                  items={currentYearMateriality} 
                  activeId={selectedModule.id} 
                  title={selectedModule.title}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function InfoItem({ label, value }: { label: string, value: string | undefined }) {
  return (
    <div>
      <h4 className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1">{label}</h4>
      <p className="text-sm font-medium text-white/90">{value || '—'}</p>
    </div>
  );
}

function KPICard({ title, value, icon, delta, info, subtitle }: { 
  title: string, 
  value: string, 
  icon: React.ReactNode, 
  delta?: number | null,
  info?: React.ReactNode,
  subtitle?: string
}) {
  return (
    <motion.div 
      whileHover={{ 
        y: -4,
        boxShadow: "0 0 20px rgba(57, 255, 20, 0.2)",
        borderColor: "rgba(57, 255, 20, 0.4)"
      }}
      className="p-6 rounded-2xl border border-white/5 bg-card-bg transition-all shadow-lg group relative"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 rounded-lg bg-white/5 text-white/60 group-hover:text-neon-green transition-colors">
          {icon}
        </div>
        <div className="flex items-center gap-2">
          {delta !== undefined && delta !== null && (
            <div className={cn(
              "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
              delta > 0 ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"
            )}>
              {delta > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(delta).toFixed(1)}%
            </div>
          )}
          {info}
        </div>
      </div>
      <div>
        <h4 className="text-sm text-white/40 font-medium mb-1">{title}</h4>
        <div className="flex flex-col">
          <p className="text-2xl font-bold tracking-tight group-hover:text-neon-green transition-colors">{value}</p>
          {subtitle && <p className="text-[10px] text-white/30 uppercase tracking-widest mt-1">{subtitle}</p>}
        </div>
      </div>
    </motion.div>
  );
}

function DisclosureCard({ title, content }: { title: string, content: string }) {
  return (
    <div className="bg-card-bg rounded-2xl p-6 border border-white/5 shadow-xl">
      <h3 className="text-sm uppercase tracking-widest text-white/40 font-bold mb-4">{title}</h3>
      <p className="text-sm text-white/80 leading-relaxed whitespace-pre-line">
        {content}
      </p>
    </div>
  );
}

function ModuleGroup({ title, modules, onSelect, getStatusColor }: { 
  title: string, 
  modules: BasicModule[], 
  onSelect: (m: BasicModule) => void,
  getStatusColor: (s: string) => string
}) {
  return (
    <div>
      <h3 className="text-sm uppercase tracking-widest text-white/40 font-bold mb-6 flex items-center gap-3">
        {title}
        <div className="h-px flex-1 bg-white/5" />
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {modules.map(module => (
          <motion.div 
            key={module.id}
            whileHover={{ scale: 1.02 }}
            onClick={() => onSelect(module)}
            className="group p-5 bg-card-bg rounded-xl border border-white/5 hover:border-neon-green/30 transition-all cursor-pointer shadow-md"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono text-white/40 group-hover:text-neon-green transition-colors">{module.id}</span>
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tighter border",
                getStatusColor(module.status)
              )}>
                {module.status}
              </span>
            </div>
            <h4 className="font-semibold mb-2 group-hover:text-neon-green transition-colors">{module.title}</h4>
            <p className="text-xs text-white/40 line-clamp-2 leading-relaxed">
              {module.description}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function AccordionItem({ module }: { module: any }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-white/5 rounded-xl overflow-hidden bg-black/20">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center text-xs font-mono text-white/40">
            {module.id}
          </div>
          <h4 className="font-semibold text-left">{module.title}</h4>
        </div>
        <div className={cn(
          "p-1 rounded-full bg-white/5 transition-transform duration-300",
          isOpen ? "rotate-180" : ""
        )}>
          <ChevronDown className="w-5 h-5 text-white/40" />
        </div>
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <div className="p-6 pt-0 border-t border-white/5">
              <div className="mt-4 space-y-4">
                <p className="text-sm text-white/40 italic mb-4">{module.description}</p>
                <div className="prose prose-invert prose-sm max-w-none">
                  <p className="text-white/80 leading-relaxed whitespace-pre-line">
                    {module.details}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
