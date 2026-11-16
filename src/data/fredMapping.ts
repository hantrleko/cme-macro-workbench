export interface FredSeriesSpec {
  id: string;
  fredCode: string;
  title: string;
  chineseName: string;
  sourceAgency: 'BEA' | 'BLS' | 'Federal Reserve' | 'US Treasury' | 'ICE BofA / FRED' | 'ISM / Conference Board';
  frequency: 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly';
  publicationLag: string;
  revisionRisk: 'None (Market Price)' | 'Low' | 'High (Benchmark & Seasonal Revisions)';
  workbenchVariable: string;
  cmePitfallNote: string;
}

export const FRED_SERIES_MAPPING: FredSeriesSpec[] = [
  {
    id: 'real-gdp',
    fredCode: 'GDPC1 / ALFRED:GDPC1',
    title: 'Real Gross Domestic Product',
    chineseName: '美国实际GDP (链式2017美元)',
    sourceAgency: 'BEA',
    frequency: 'Quarterly',
    publicationLag: '季度结束后约30天发布初值 (Advance)，经Second/Third及年度基准三次修订',
    revisionRisk: 'High (Benchmark & Seasonal Revisions)',
    workbenchVariable: 'realTrendGdp / gdpTrajectory',
    cmePitfallNote: '典型 Time Lag + Revisions 陷阱：必须使用 ALFRED Point-in-Time 快照回测，否则存在严重前瞻偏差。',
  },
  {
    id: 'core-pce',
    fredCode: 'PCEPILFE',
    title: 'Core PCE Price Index YoY',
    chineseName: '美国核心PCE物价指数 (美联储锚定目标)',
    sourceAgency: 'BEA',
    frequency: 'Monthly',
    publicationLag: '月度结束后约28-30天',
    revisionRisk: 'High (Benchmark & Seasonal Revisions)',
    workbenchVariable: 'expectedInflation / targetInflation',
    cmePitfallNote: '相较CPI存在权数差异，且存在历史季调修订；美联储正式通胀目标 π_target = 2.0%。',
  },
  {
    id: 'fed-funds',
    fredCode: 'FEDFUNDS / DFEDTARU',
    title: 'Effective Federal Funds Rate',
    chineseName: '有效联邦基金利率',
    sourceAgency: 'Federal Reserve',
    frequency: 'Daily',
    publicationLag: 'T+1 工作日 (无滞后)',
    revisionRisk: 'None (Market Price)',
    workbenchVariable: 'actualFedFundsRate',
    cmePitfallNote: '在2008-2015及2020-2021年处于ZLB零下限区间，统计模型直接拟合易发生体制断裂。',
  },
  {
    id: 'ust-curve',
    fredCode: 'DGS3MO, DGS2, DGS10, DGS30, T10Y2Y',
    title: 'US Treasury Constant Maturity Curve',
    chineseName: '美国国债收益率曲线与10Y-2Y利差',
    sourceAgency: 'US Treasury',
    frequency: 'Daily',
    publicationLag: '日频实时',
    revisionRisk: 'None (Market Price)',
    workbenchVariable: 'yieldCurve / slope10Y2Y',
    cmePitfallNote: 'QE期间10Y-2Y倒挂信号可能被美联储期限溢价压缩所扭曲（图8考虑因素#4）。',
  },
  {
    id: 'cbo-potential-gdp',
    fredCode: 'GDPPOT / NROU',
    title: 'CBO Real Potential GDP & NAIRU',
    chineseName: 'CBO估算美国潜在GDP与自然失业率',
    sourceAgency: 'BEA',
    frequency: 'Quarterly',
    publicationLag: '半年度更新，且事后大幅重估',
    revisionRisk: 'High (Benchmark & Seasonal Revisions)',
    workbenchVariable: 'outputGap / neutralRealRate',
    cmePitfallNote: '泰勒规则核心痛点（图7）：Y_trend 与 r_neutral 均为不可观测隐变量，实时估计误差极大。',
  },
  {
    id: 'credit-spreads',
    fredCode: 'BAMLC0A0CM / BAMLH0A0HYM2',
    title: 'ICE BofA US IG & High Yield OAS',
    chineseName: '美国投资级与高收益公司债期权调整利差',
    sourceAgency: 'ICE BofA / FRED',
    frequency: 'Daily',
    publicationLag: '日频实时',
    revisionRisk: 'Low',
    workbenchVariable: 'assetForecasts (IG & HY Spreads)',
    cmePitfallNote: '在商业周期“放缓”至“收缩”阶段急剧走阔，具有显著左偏尾部风险（Peso Problem）。',
  },
  {
    id: 'twin-deficits',
    fredCode: 'NETEXP / FYFSGDA188S / GFDEGDQ188S',
    title: 'Net Exports, Fiscal Deficit & Debt/GDP',
    chineseName: '美国净出口、财政赤字率与联邦债务/GDP',
    sourceAgency: 'BEA',
    frequency: 'Quarterly',
    publicationLag: '季度结束后约60-85天',
    revisionRisk: 'High (Benchmark & Seasonal Revisions)',
    workbenchVariable: 'currentAccountPctGdp / fiscalDeficitPctGdp / govDebtPctGdp',
    cmePitfallNote: '严格满足国民收入恒等式 (X-M) = (S-I) + (T-G)；高 Debt/GDP 推升央行政治化与通胀螺旋风险。',
  },
  {
    id: 'commercial-reit',
    fredCode: 'COMREPUSQ159N / NCREIF vs FTSE NAREIT',
    title: 'US Commercial Real Estate Appraisal vs REITs',
    chineseName: '美国商业地产估值指数与上市REITs指数',
    sourceAgency: 'Federal Reserve',
    frequency: 'Quarterly',
    publicationLag: '季度结束后约45-60天（存在显著估值滞后）',
    revisionRisk: 'High (Benchmark & Seasonal Revisions)',
    workbenchVariable: 'appraisalSmoothingAlpha / unsmoothedReitVol',
    cmePitfallNote: '典型 Appraisal Smoothing 陷阱（图1）：未去平滑时波动率与股债相关性被严重低估。',
  },
];
