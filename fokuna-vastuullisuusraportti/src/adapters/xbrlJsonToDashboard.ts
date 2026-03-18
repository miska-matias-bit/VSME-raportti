import { SustainabilityData, YearData, KPI, BasicModule, ExtendedModule } from '../types';
import { translateFi } from '../i18n/translate';

export interface XbrlFact {
  value: string;
  decimals?: number;
  dimensions: {
    concept: string;
    entity: string;
    period: string;
    unit?: string;
    [key: string]: any;
  };
}

export interface XbrlReport {
  documentInfo: any;
  facts: { [key: string]: XbrlFact };
}

export function xbrlJsonToSustainabilityData(xbrl: XbrlReport, baseData: SustainabilityData): SustainabilityData {
  const facts = Object.values(xbrl.facts);

  const getFactValue = (concept: string) => {
    return facts.find(f => f.dimensions.concept === concept)?.value;
  };

  const getNumericFact = (concept: string) => {
    const val = getFactValue(concept);
    return val ? parseFloat(val) : 0;
  };

  // KPI Calculations
  const electricity_mwh_raw = getNumericFact('vsme:TotalEnergyConsumption');
  const scope1_tco2e_raw = getNumericFact('vsme:GrossScope1GreenhouseGasEmissions');
  const scope2_tco2e_xbrl = getNumericFact('vsme:GrossLocationBasedScope2GreenhouseGasEmissions');
  const scope3_tco2e_raw = getNumericFact('vsme:GrossScope3GreenhouseGasEmissions');

  const electricity_kwh_raw = electricity_mwh_raw * 1000;
  const electricity_kwh_display = Math.round(electricity_kwh_raw);
  
  // Scope 2 calculation logic
  const emissionFactor_g_per_kwh = 26;
  let scope2_kg_raw = scope2_tco2e_xbrl * 1000;
  
  // If electricity consumption exists, override Scope 2 with calculated value
  if (electricity_mwh_raw > 0) {
    scope2_kg_raw = (electricity_kwh_raw * emissionFactor_g_per_kwh) / 1000;
  }
  
  const scope2_t_raw = scope2_kg_raw / 1000;
  const scope2_kg_display = Math.round(scope2_kg_raw * 10) / 10;

  const scope1_kg_raw = scope1_tco2e_raw * 1000;
  const scope1_kg_display = Math.round(scope1_kg_raw * 10) / 10;

  const scope3_kg_raw = scope3_tco2e_raw * 1000;
  const scope3_kg_display = Math.round(scope3_kg_raw * 10) / 10;

  const kpi: KPI = {
    electricity_kwh: electricity_kwh_display,
    electricity_kwh_raw,
    scope1_kg: scope1_kg_display,
    scope1_kg_raw,
    scope2_kg: scope2_kg_display,
    scope2_kg_raw,
    scope2_t_raw,
    scope3_kg: scope3_kg_display,
    scope3_kg_raw,
    scope3_status: scope3_kg_raw > 0 ? "Arvioitu" : "Ei raportoitu",
    emissionFactor_g_per_kwh,
    source: "Fingrid, Suomessa kulutetun sähkön päästökerroin (26 gCO₂/kWh). Viitattu 2.3.2026."
  };

  // Disclosures
  const disclosures = {
    general: translateFi(getFactValue('vsme:DisclosureOfAnyOtherGeneralAndOrEntitySpecificInformation')),
    environmental: translateFi(getFactValue('vsme:DisclosureOfAnyOtherEnvironmentalAndOrEntitySpecificEnvironmentalDisclosures')),
    social: translateFi(getFactValue('vsme:DisclosureOfAnyOtherSocialAndOrEntitySpecificSocialDisclosures')),
    governance: translateFi(getFactValue('vsme:DisclosureOfAnyOtherGovernanceAndOrEntitySpecificGovernanceDisclosures'))
  };

  // Update Modules if facts exist
  const updatedBasicModules = baseData.modules.basic.map(mod => {
    if (mod.id === 'B7') {
      const circularEconomyDesc = getFactValue('vsme:DescriptionOfHowCircularEconomyPrinciplesAreApplied');
      if (circularEconomyDesc) {
        return { ...mod, details: translateFi(circularEconomyDesc) || mod.details };
      }
    }
    return mod;
  });

  const year2025: YearData = {
    year: 2025,
    reportingPeriod: "6.10.2025 - 31.12.2025",
    kpi,
    disclosures
  };

  // Filter out existing 2025 data and add the new one
  const otherYears = baseData.years.filter(y => y.year !== 2025);

  return {
    ...baseData,
    company: {
      ...baseData.company,
      name: "Fokuna",
      businessId: "3569982-7",
      industry: "TOL 70200 Liikkeenjohdon konsultointi",
      location: "Kokkola, Suomi",
      employees: 0,
      entrepreneur: 1,
      ownerForm: "Yksityinen elinkeinoharjoittaja"
    },
    years: [...otherYears, year2025].sort((a, b) => a.year - b.year),
    modules: {
      ...baseData.modules,
      basic: updatedBasicModules
    }
  };
}
