
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
  facts: Record<string, XbrlFact>;
}

export const getFactValue = (report: XbrlReport, concept: string): string | null => {
  const fact = Object.values(report.facts).find(f => f.dimensions.concept === concept);
  return fact ? fact.value : null;
};

export const parseReportingPeriod = (period: string): string => {
  // period format: "2025-10-06T00:00:00/2026-01-01T00:00:00"
  const [start, end] = period.split('/');
  
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    // If it's the start of a year (like 2026-01-01), we might want to show the day before if it's an end date
    // But the requirement says "6.10.2025 - 31.12.2025"
    // Let's check the end date. If it's 2026-01-01T00:00:00, it usually means up to the end of 2025.
    if (dateStr.includes('01-01T00:00:00')) {
        const prevDay = new Date(d);
        prevDay.setDate(prevDay.getDate() - 1);
        return `${prevDay.getDate()}.${prevDay.getMonth() + 1}.${prevDay.getFullYear()}`;
    }
    return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
  };

  return `${formatDate(start)} - ${formatDate(end)}`;
};

export const mapXbrlToKpi = (report: XbrlReport) => {
  const energyMWh = parseFloat(getFactValue(report, 'vsme:TotalEnergyConsumption') || '0');
  const electricity_kwh = energyMWh * 1000;
  
  const scope1_t = parseFloat(getFactValue(report, 'vsme:GrossScope1GreenhouseGasEmissions') || '0');
  const scope1_kg = scope1_t * 1000;
  
  const scope2_t = parseFloat(getFactValue(report, 'vsme:GrossLocationBasedScope2GreenhouseGasEmissions') || '0');
  let scope2_kg = scope2_t * 1000;
  
  // Fallback: Jos arvo on 0 mutta electricity_kwh > 0: Laske: scope2_kg = electricity_kwh * 26 / 1000
  if (scope2_kg === 0 && electricity_kwh > 0) {
    scope2_kg = (electricity_kwh * 26) / 1000;
  }
  
  const scope3_t = parseFloat(getFactValue(report, 'vsme:GrossScope3GreenhouseGasEmissions') || '0');
  const scope3_kg = scope3_t * 1000;
  const scope3_status = scope3_kg > 0 ? "Raportoitu (arvio)" : "Ei raportoitu";
  
  // Period
  const energyFact = Object.values(report.facts).find(f => f.dimensions.concept === 'vsme:TotalEnergyConsumption');
  const reportingPeriod = energyFact ? parseReportingPeriod(energyFact.dimensions.period) : "6.10.2025 - 31.12.2025";

  // Additional disclosures
  const disclosures = {
    general: getFactValue(report, 'vsme:DisclosureOfAnyOtherGeneralAndOrEntitySpecificInformation'),
    environmental: getFactValue(report, 'vsme:DisclosureOfAnyOtherEnvironmentalAndOrEntitySpecificEnvironmentalDisclosures'),
    social: getFactValue(report, 'vsme:DisclosureOfAnyOtherSocialAndOrEntitySpecificSocialDisclosures'),
    governance: getFactValue(report, 'vsme:DisclosureOfAnyOtherGovernanceAndOrEntitySpecificGovernanceDisclosures'),
  };

  return {
    kpi: {
      scope1_kg,
      scope2_kg,
      scope3_kg,
      scope3_status,
      electricity_kwh,
      emissionFactor_g_per_kwh: 26,
      source: "Fingrid, Suomessa kulutetun sähkön CO₂-päästökerroin (26 gCO₂/kWh). Viitattu 2.3.2026."
    },
    reportingPeriod,
    disclosures
  };
};

export const mapXbrlToAppData = (report: XbrlReport) => {
  const mapped = mapXbrlToKpi(report);
  return {
    years: [
      {
        year: 2025,
        reportingPeriod: mapped.reportingPeriod,
        kpi: mapped.kpi
      }
    ],
    sources: [
      {
        name: "Fingrid",
        url: "https://www.fingrid.fi",
        description: mapped.kpi.source
      }
    ]
  };
};
