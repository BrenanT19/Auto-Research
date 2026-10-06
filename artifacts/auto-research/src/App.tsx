import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode, FormEvent, KeyboardEvent } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Link, Route, Switch, useLocation, useParams, Router as WouterRouter } from 'wouter';
import { getGetVehicleQueryKey, useGetCatalogOptions, useGetDiscoveryStats, useGetMake, useGetVehicle, useListMakes, useListOwnerReports, useListPopularVehicles, useListTrendingVehicles, useListVehicles, useSubmitOwnerExperience } from '@workspace/api-client-react';
import type { Make, VehicleDetail, VehicleSummary } from '@workspace/api-client-react';
import { ArrowDown, ArrowRight, ArrowUpRight, BadgeCheck, BookOpen, Calculator, Check, ChevronDown, CircleAlert, Fuel, Info, Menu, Search, Shield, SlidersHorizontal, Wrench, X } from 'lucide-react';
import { addComparisonId, buildBrowseLocation, buildComparisonLocation, buildVehicleListParams, homeTrendEvidence, isEnteredCalculatorValue, mergeCanonicalCalculatorPrefill, missingCanonicalFinancingInputs, resetUneditedCalculatorDraft, calculateOwnershipEstimate, catalogGenerationKey, catalogModelKey, catalogTrimKey, clearBrowseFilters, economyUnit, getBrowseGenerationOptions, getBrowseSuggestions, getGenerationFilterHint, hasActiveBrowseFilters, hasInvalidBrowseSelection, isGenerationFilterEnabled, normalizeCalculatorNumber, parseCalculatorNumber, optionalVehicleQueryOptions, parseBrowseFilters, parseComparisonIds, profileResearchState, readOwnershipDraft, removeComparisonId, resolveBrowseFilters, researchStateLabel, summarizeMonthlyOwnershipCosts } from './shopper-tools';
import type { BrowseFilters, BrowseSuggestion, OwnershipDraft, ReportSectionId, ResearchFieldState } from './shopper-tools';
import { calculateFinancingEstimate } from './financing';
import { STATE_TAX_ESTIMATES } from './state-tax-estimates';
import { FinancingAnalysis, PurchaseBreakdown } from './components/FinancingAnalysis';
import { GenerationSelect } from './components/GenerationSelect';
import { useBrowseResetScroll } from './hooks/use-browse-reset-scroll';
import { useReportNavigation } from './hooks/use-report-navigation';
import { CanonicalEvidence } from './components/CanonicalEvidence';
import { CanonicalProfileStatus } from './components/CanonicalProfileStatus';
import { ExternalOwnerPatterns } from './components/ExternalOwnerPatterns';

const queryClient = new QueryClient();
const money = (n?: number | null) => n == null ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
const label = (v: VehicleSummary) => `${v.year} ${v.make} ${v.model}${v.trim ? ` ${v.trim}` : ''}`;

function DemoNotice({ compact = false }: { compact?: boolean }) {
  return <div className={`demo-notice ${compact ? 'compact' : ''}`}><Info size={15} /><span><b>RESEARCH STATUS VARIES BY VEHICLE AND FIELD</b> — Canonical profiles verify exact vehicle identity, not every optional claim. Demo profiles and estimates are illustrative, not verified automotive guidance. Confirm recalls and safety information with <a href="https://www.nhtsa.gov/recalls" target="_blank" rel="noreferrer">NHTSA</a> and the vehicle manufacturer.</span></div>;
}

function Header() {
  const [open, setOpen] = useState(false);
  const nav = [['Home', '/'], ['Browse cars', '/browse'], ['Compare', '/compare'], ['Calculator', '/calculator'], ['Community', '/community'], ['About', '/about']];
  return <header className="site-header">
    <Link href="/" className="brand"><span className="brand-mark">ar</span><span>auto<span className="brand-light">research</span><small>THE LONG VIEW ON CARS</small></span></Link>
    <button className="mobile-menu" aria-label="Toggle navigation" onClick={() => setOpen(!open)}><Menu size={21}/></button>
    <nav className={open ? 'nav-open' : ''}>{nav.map(([name, href]) => <Link key={href} href={href} onClick={() => setOpen(false)}>{name}</Link>)}</nav>
    <Link href="/browse" className="header-cta">Browse cars <ArrowRight size={15}/></Link>
  </header>;
}

function Shell({ children }: { children: ReactNode }) {
  return <div className="grain min-h-[100dvh]"><Header/><main>{children}</main><footer className="footer"><Link href="/" className="brand"><span className="brand-mark">ar</span><span>auto<span className="brand-light">research</span></span></Link><span>Independent thinking for the long road.</span><Link href="/about">How we handle data <ArrowUpRight size={14}/></Link></footer></div>;
}

function PageIntro({ eyebrow, title, sub, action }: { eyebrow: string; title: string; sub: string; action?: ReactNode }) {
  return <div className="page-intro enter"><div><span className="eyebrow">{eyebrow}</span><h1 className="serif">{title}</h1><p>{sub}</p></div>{action}</div>;
}

function LoadingBlock() { return <div className="skeleton-grid"><div className="skeleton tall"/><div className="skeleton"/><div className="skeleton"/></div>; }
function ErrorBlock({ retry }: { retry: () => void }) { return <div className="state-box"><CircleAlert/><h3>We couldn't load this research</h3><p>Give it another try in a moment.</p><button className="button secondary" onClick={retry}>Try again</button></div>; }
function EmptyBlock({ title = 'No vehicles found', text = 'Try broadening your search or clearing a filter.' }: { title?: string; text?: string }) { return <div className="state-box"><Search/><h3>{title}</h3><p>{text}</p></div>; }

function Reliability({ score, size = 'normal' }: { score: number | null; size?: string }) {
  if (score == null) return <div className={`reliability ${size}`}><span className="score">—</span><span className="score-meta"><small>NOT SCORED</small></span></div>;
  const safe = Math.max(0, Math.min(10, score));
  return <div className={`reliability ${size}`}><span className="score">{safe.toFixed(1)}</span><span className="score-meta"><span className="score-track"><i style={{ width: `${safe * 10}%` }}/></span><small>EST. / 10</small></span></div>;
}

function VehicleCard({ vehicle, onCompare, selected = false }: { vehicle: VehicleSummary; onCompare?: (v: VehicleSummary) => void; selected?: boolean }) {
  const canonical = vehicle.profileKind === "canonical" && !vehicle.isDemo;
  return <article className="vehicle-card">
    <div className={`car-art art-${(vehicle.imageKey || 'sedan').replace(/[^a-z0-9]/gi, '').toLowerCase()}`} aria-label={`Vehicle photo placeholder for ${label(vehicle)}`}><span className="art-caption">{vehicle.bodyType || (canonical ? 'BODY TYPE NOT LISTED' : 'OWNERSHIP PROFILE')}</span></div>
    <div className="vehicle-card-body"><div className="card-overline">{vehicle.year} · {vehicle.generation || 'MODEL YEAR'}</div><Link href={`/vehicles/${vehicle.id}`} className="vehicle-title serif">{vehicle.make} {vehicle.model}</Link><div className="trim-line">{vehicle.trim} <span>·</span> {vehicle.drivetrain || (canonical ? "—" : "")}</div>
      <CanonicalProfileStatus vehicle={vehicle}/>
      <div className="vehicle-score-row">{canonical ? <><CanonicalEvidence state={vehicle.fieldStates?.reliabilityEstimate || vehicle.fieldStates?.reliability} claims={vehicle.claims}/>{vehicle.reliabilityEstimate != null && <span>{vehicle.reliabilityEstimate} / 10</span>}</> : <><Reliability score={vehicle.reliabilityEstimate}/><span className="estimate-caption">estimated reliability</span></>}</div>
      <div className="vehicle-card-foot"><span><b>{money(vehicle.annualOwnershipEstimateUsd)}</b><small>annual ownership est.</small></span></div>
      {canonical && <CanonicalEvidence state={vehicle.fieldStates?.annualOwnershipEstimateUsd || vehicle.fieldStates?.ownership} claims={vehicle.claims}/>}
      <Link href={`/vehicles/${vehicle.id}`} className="circle-link" aria-label={`View full ownership report for ${label(vehicle)}`}>View full ownership report <ArrowRight size={16}/></Link>
      {onCompare && <button className={`compare-toggle ${selected ? 'chosen' : ''}`} onClick={() => onCompare(vehicle)}>{selected ? <Check size={14}/> : <span className="plus">+</span>}{selected ? 'Added to compare' : 'Add to compare'}</button>}
    </div>
  </article>;
}

function SectionHeading({ kicker, title, link, href }: { kicker: string; title: string; link?: string; href?: string }) {
  return <div className="section-heading"><div><span className="eyebrow">{kicker}</span><h2 className="serif">{title}</h2></div>{link && href && <Link href={href} className="text-link">{link} <ArrowRight size={15}/></Link>}</div>;
}

function HomePage() {
  const makes = useListMakes();
  const popular = useListPopularVehicles();
  const trending = useListTrendingVehicles();
  const stats = useGetDiscoveryStats();
  const searchCatalogOptions = useGetCatalogOptions();
  const [q, setQ] = useState('');
  const [searchYear, setSearchYear] = useState('');
  const [searchMake, setSearchMake] = useState('');
  const [searchModelKey, setSearchModelKey] = useState('');
  const [searchTrimKey, setSearchTrimKey] = useState('');
  const [, setLoc] = useLocation();
  const options = searchCatalogOptions.data || [];
  const searchYears = [...new Set(options.map(v => v.year))].sort((a, b) => b - a);
  const searchModelOptions = [...new Map(options.filter(v =>
    (!searchMake || v.makeSlug === searchMake) && (!searchYear || v.year === Number(searchYear)),
  ).map(option => [catalogModelKey(option), option])).values()];
  const selectedSearchModel = options.find(option => catalogModelKey(option) === searchModelKey);
  const searchTrimOptions = [...new Map(options.filter(option =>
    (!searchMake || option.makeSlug === searchMake) &&
    (!searchYear || option.year === Number(searchYear)) &&
    (!searchModelKey || catalogModelKey(option) === searchModelKey),
  ).map(option => [catalogTrimKey(option), option])).values()];
  const selectedSearchTrim = options.find(option => catalogTrimKey(option) === searchTrimKey);
  const find = (e: FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (searchYear) params.set('year', searchYear);
    if (searchMake) params.set('make', searchMake);
    if (selectedSearchModel?.profileKind === "canonical") params.set('modelKey', catalogModelKey(selectedSearchModel));
    else if (selectedSearchModel) params.set('model', selectedSearchModel.model);
    if (selectedSearchTrim?.profileKind === "canonical") params.set('trimKey', catalogTrimKey(selectedSearchTrim));
    else if (selectedSearchTrim) params.set('trim', selectedSearchTrim.trim);
    setLoc(`/browse${params.size ? `?${params.toString()}` : ''}`);
  };
  const popularItems = popular.data || [];
  const trendingItems = trending.data || [];
  return <Shell>
    <section className="hero">
      <div className="hero-copy"><span className="eyebrow"><span className="live-dot"/> RESEARCH THE OWNERSHIP, NOT THE HYPE</span><h1 className="serif">Know What You’re Buying.</h1><p>Research reliability, common problems, maintenance costs and real-world ownership information before you buy your next car.</p>
        <form className="hero-search-form" onSubmit={find}>
          <div className="hero-search"><Search size={18}/><input aria-label="Search vehicles" placeholder="Search 2018 BMW 340i" value={q} onChange={e => setQ(e.target.value)}/><button aria-label="Search"><ArrowRight size={19}/></button></div>
          <div className="hero-search-selects">
            <label>Year<select disabled={!searchCatalogOptions.data} value={searchYear} onChange={e => { setSearchYear(e.target.value); setSearchModelKey(''); setSearchTrimKey(''); }}><option value="">Any year</option>{searchYears.map(y => <option key={y} value={y}>{y}</option>)}</select></label>
            <label>Make<select disabled={makes.isLoading || makes.isError} value={searchMake} onChange={e => { setSearchMake(e.target.value); setSearchModelKey(''); setSearchTrimKey(''); }}><option value="">Any make</option>{(makes.data || []).map(m => <option key={m.makeKey || `legacy:make:${m.id}`} value={m.slug}>{m.name}</option>)}</select></label>
            <label>Model<select disabled={!searchCatalogOptions.data} value={searchModelKey} onChange={e => { setSearchModelKey(e.target.value); setSearchTrimKey(''); }}><option value="">Any model</option>{searchModelOptions.map(option => <option key={catalogModelKey(option)} value={catalogModelKey(option)}>{option.model}{option.profileKind === "canonical" ? " · canonical" : ""}</option>)}</select></label>
            <label>Trim<select disabled={!searchCatalogOptions.data} value={searchTrimKey} onChange={e => setSearchTrimKey(e.target.value)}><option value="">Any trim</option>{searchTrimOptions.map(option => <option key={catalogTrimKey(option)} value={catalogTrimKey(option)}>{option.trim}{option.profileKind === "canonical" ? " · canonical" : ""}</option>)}</select></label>
          </div>
          {searchCatalogOptions.isError && <div className="hero-search-catalog-error" role="status">Vehicle filters are unavailable. Search by text, or <button type="button" onClick={() => searchCatalogOptions.refetch()}>retry catalog options</button>.</div>}
          <button className="button dark hero-search-submit">Find vehicles <ArrowRight size={15}/></button>
        </form>
        <div className="hero-shortcuts">
          <span>TRY</span>
          {['Ford F-150', 'Chevrolet Silverado', 'Tesla Model Y'].map(x => (
            <button key={x} onClick={() => { setQ(x); setLoc(`/browse?q=${encodeURIComponent(x)}`); }}>{x}</button>
          ))}
        </div>
      </div>
      <div className="hero-visual"><div className="hero-stamp">High confidence<br/>starts with good research</div><div className="hero-art" role="img" aria-label="Vehicle photography placeholder. No licensed demo vehicle photography is available."/><div className="hero-facts"><span><b>{stats.data?.vehicleCount ?? '—'}</b> vehicle trims</span><span><b>{stats.data?.makeCount ?? '—'}</b> manufacturers</span><span className="mono">RESEARCH STATUS VARIES</span></div></div>
      <div className="hero-bottom"><span>01 / START WITH THE LONG VIEW</span><a href="#explore">Scroll to explore <ArrowDown size={14}/></a></div>
    </section>
    <div className="content-wrap">
      <DemoNotice/>
      <section id="explore" className="content-section">
        <SectionHeading kicker="THE SHORTLIST" title="Popular Vehicles" link="Browse all cars" href="/browse"/>
        {popular.isLoading ? <LoadingBlock/> : popular.isError ? <ErrorBlock retry={() => popular.refetch()}/> : popularItems.length ? <div className="vehicle-grid">{popularItems.slice(0, 4).map(v => <VehicleCard key={v.id} vehicle={v}/>)}</div> : <EmptyBlock/>}
      </section>
       <section className="split-feature"><div className="feature-note"><span className="eyebrow">NOT JUST THE STICKER PRICE</span><h2 className="serif">Know the cost<br/>of keeping it.</h2><p>Fuel, maintenance, insurance, repairs and depreciation all add up. Build a monthly estimate that reflects how you actually drive.</p><Link href="/calculator" className="button dark">Estimate ownership cost <ArrowRight size={16}/></Link></div><div className="cost-visual"><div className="cost-card"><span className="eyebrow">A MORE COMPLETE PICTURE</span><strong className="serif">$ / month</strong><div className="cost-bars"><i/><i/><i/><i/><i/></div><div className="cost-labels"><span>Fuel</span><span>Service</span><span>Cover</span><span>Value</span></div><small>Illustrative ownership categories</small></div><div className="orbit orbit-a"/><div className="orbit orbit-b"/><div className="orbit-dot"/></div></section>
        <section className="reliability-explainer"><div><span className="eyebrow">RELIABILITY NEEDS CONTEXT</span><h2 className="serif">A score is a starting point,<br/>not a promise.</h2></div><p>Look at model year, powertrain, service history and specific reported problems—not just one number. Demo ratings are illustrative; canonical profiles show a separate research state for each field, and missing research stays blank.</p><Link href="/browse?sort=reliability" className="text-link">Browse reliability estimates <ArrowRight size={15}/></Link></section>
      <section className="content-section">
        <SectionHeading kicker="IN THE CONVERSATION" title="Most researched this week" link="See all vehicles" href="/browse?sort=popular"/>
        {trending.isLoading ? <LoadingBlock/> : trending.isError ? <ErrorBlock retry={() => trending.refetch()}/> : trendingItems.length ? <div className="trend-list">{trendingItems.slice(0, 5).map((v, i) => {
          const canonical = v.profileKind === "canonical" && v.isDemo === false;
          const ownership = homeTrendEvidence(v, "annualOwnershipEstimateUsd", v.annualOwnershipEstimateUsd);
          const reliability = homeTrendEvidence(v, "reliabilityEstimate", v.reliabilityEstimate);
          const evidenceLabel = (metric: typeof ownership) => metric.kind === "canonical"
            ? `${researchStateLabel(metric.state)}${metric.state?.reason ? ` — ${metric.state.reason}` : ""}`
            : metric.kind === "demo" ? "Illustrative demo estimate" : "Research status unavailable";
          return <Link key={v.id} href={`/vehicles/${v.id}`} className="trend-row">
            <span className="trend-rank mono">0{i + 1}</span>
            <span className="trend-name"><small>{v.year} / {v.trim}</small><b className="serif">{v.make} {v.model}</b></span>
            <span className="trend-cost"><span>{money(ownership.value)}</span><small>{canonical ? `Annual estimate · ${evidenceLabel(ownership)}` : evidenceLabel(ownership)}</small></span>
            {canonical
              ? <span className="trend-reliability"><b>{reliability.value == null ? "—" : `${reliability.value.toFixed(1)} / 10`}</b><small>{evidenceLabel(reliability)}</small></span>
              : <span className="trend-reliability"><Reliability score={reliability.value} size="small"/><small>{evidenceLabel(reliability)}</small></span>}
            <ArrowUpRight size={17}/>
          </Link>;
        })}</div> : <EmptyBlock/>}
      </section>
       <section className="makes-section"><div className="makes-intro"><span className="eyebrow">EXPLORE THE FIELD</span><h2 className="serif">Start with<br/>a name you know.</h2><p>Browse manufacturer profiles and compare the vehicles in their lineup.</p></div><div className="make-list">{makes.isLoading ? <div className="skeleton"/> : makes.isError ? <button className="button secondary" onClick={() => makes.refetch()}>Retry manufacturers</button> : (makes.data || []).map((m: Make, i) => <Link href={`/manufacturers/${m.slug}`} className="make-row" key={m.makeKey || `legacy:make:${m.id}`}><span className="make-mark">{m.mark}</span><span><b>{m.name}</b><small>{m.vehicleCount} researched trims</small></span><span className="make-index mono">{String(i + 1).padStart(2, '0')}</span><ArrowUpRight size={16}/></Link>)}</div></section>
      <section className="closing-cta"><div><span className="eyebrow">A GOOD DECISION TAKES CONTEXT</span><h2 className="serif">Compare the things<br/>that matter after day one.</h2></div><Link href="/compare" className="button light">Build a comparison <ArrowRight size={16}/></Link></section>
    </div>
  </Shell>;
}

function BrowsePage() {
  const [browse, setBrowse] = useState<BrowseFilters>(() => parseBrowseFilters(window.location.search));
  const [draft, setDraft] = useState(browse.q);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [composing, setComposing] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const [loc, setLoc] = useLocation();
  const catalogOptions = useGetCatalogOptions();
  const catalog = catalogOptions.data || [];
  const suggestions = useMemo(() => getBrowseSuggestions(draft, catalog), [draft, catalog]);
  const catalogReady = Boolean(catalogOptions.data);
  const invalidHierarchyFilter = catalogReady && hasInvalidBrowseSelection(browse, catalog);

  useEffect(() => {
    const restoreFromUrl = () => {
      const next = parseBrowseFilters(window.location.search);
      setBrowse(next);
      setDraft(next.q);
      setSuggestionsOpen(false);
      setActiveSuggestion(-1);
    };
    window.addEventListener("popstate", restoreFromUrl);
    return () => window.removeEventListener("popstate", restoreFromUrl);
  }, []);

  useEffect(() => {
    if (!catalogReady) return;
    const resolved = resolveBrowseFilters(browse, catalog);
    if (JSON.stringify(resolved) !== JSON.stringify(browse)) {
      setBrowse(resolved);
    }
    const canonicalLocation = buildBrowseLocation(resolved);
    if (canonicalLocation !== `${window.location.pathname}${window.location.search}`) {
      setLoc(canonicalLocation, { replace: true });
    }
    if (resolved.q !== browse.q) setDraft(resolved.q);
  }, [catalogReady, catalog, browse, setLoc]);

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !searchBoxRef.current?.contains(event.target)) {
        setSuggestionsOpen(false);
        setActiveSuggestion(-1);
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);

  const commit = (next: BrowseFilters, replace = false) => {
    setBrowse(next);
    setDraft(next.q);
    setSuggestionsOpen(false);
    setActiveSuggestion(-1);
    const location = buildBrowseLocation(next);
    if (location !== `${window.location.pathname}${window.location.search}`) {
      setLoc(location, replace ? { replace: true } : undefined);
    }
  };
  const { resultsAreaRef, scrollAfterReset } = useBrowseResetScroll();
  const clearAllFilters = () => scrollAfterReset(() => commit(clearBrowseFilters()));
  const updateFilters = (changes: Partial<BrowseFilters>) => {
    const candidate = { ...browse, ...changes };
    const next = catalogReady ? resolveBrowseFilters(candidate, catalog) : candidate;
    commit(next);
  };
  const selectSuggestion = (suggestion: BrowseSuggestion) => {
    if (suggestion.kind === "manufacturer") {
      updateFilters({ q: "", make: suggestion.makeSlug, model: "", modelId: "", modelKey: "", generationId: "", generationKey: "", year: "", trim: "", trimId: "", trimKey: "" });
      return;
    }
    updateFilters({
      q: "", make: suggestion.makeSlug, model: "",
      modelId: suggestion.profileKind === "canonical" ? "" : String(suggestion.modelId),
      modelKey: suggestion.profileKind === "canonical" ? suggestion.modelKey || "" : "",
      generationId: "", generationKey: "", year: "", trim: "", trimId: "", trimKey: "",
    });
  };
  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (composing || event.nativeEvent.isComposing) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSuggestionsOpen(true);
      setActiveSuggestion((current) => suggestions.length ? (current + 1) % suggestions.length : -1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSuggestionsOpen(true);
      setActiveSuggestion((current) => suggestions.length ? (current <= 0 ? suggestions.length - 1 : current - 1) : -1);
    } else if (event.key === "Escape") {
      setSuggestionsOpen(false);
      setActiveSuggestion(-1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (suggestionsOpen && activeSuggestion >= 0 && suggestions[activeSuggestion]) {
        selectSuggestion(suggestions[activeSuggestion]);
      } else {
        commit({ ...browse, q: draft.trim() });
      }
    }
  };

  const makeOptions = [...new Map(catalog.map((option) => [option.makeSlug, { slug: option.makeSlug, name: option.make }])).values()];
  const scoped = catalog.filter((option) => !browse.make || option.makeSlug === browse.make);
  const modelOptions = [...new Map(scoped.map((option) => {
    const key = catalogModelKey(option);
    return [key, { value: option.profileKind === "canonical" ? key : String(option.modelId), name: option.model }];
  })).values()];
  const selectedModelOptions = scoped.filter((option) =>
    (!browse.modelId || String(option.modelId) === browse.modelId) &&
    (!browse.modelKey || catalogModelKey(option) === browse.modelKey));
  const generationOptions = getBrowseGenerationOptions(selectedModelOptions);
  const generationFilterEnabled = isGenerationFilterEnabled({
    catalogReady,
    modelSelected: Boolean(browse.modelId || browse.modelKey),
  });
  const generationHint = getGenerationFilterHint({
    catalogReady,
    modelSelected: Boolean(browse.modelId || browse.modelKey),
    generationCount: generationOptions.length,
  });
  const selectedGenerationOptions = selectedModelOptions.filter((option) =>
    (!browse.generationId || String(option.generationId) === browse.generationId) &&
    (!browse.generationKey || catalogGenerationKey(option) === browse.generationKey));
  const yearOptions = [...new Set(selectedGenerationOptions.map((option) => option.year))].sort((a, b) => a - b);
  const selectedYearOptions = selectedGenerationOptions.filter((option) => !browse.year || String(option.year) === browse.year);
  const trimOptions = [...new Map(selectedYearOptions.map((option) => {
    const key = catalogTrimKey(option);
    return [key, { value: option.profileKind === "canonical" ? key : String(option.trimId), name: option.trim }];
  })).values()];
  const filters = useMemo(() => buildVehicleListParams(browse), [browse]);
  const vehicles = useListVehicles(filters);
  const [selected, setSelected] = useState<string[]>([]);
  const toggle = (v: VehicleSummary) => setSelected(s => s.includes(v.id) ? s.filter(id => id !== v.id) : s.length < 4 ? [...s, v.id] : s);
  const canonicalResults = Boolean(vehicles.data?.length) && vehicles.data!.every(vehicle => vehicle.profileKind === "canonical" && !vehicle.isDemo);
  return <Shell><div className="content-wrap page-wrap"><PageIntro eyebrow="THE VEHICLE INDEX" title="Find the right long view." sub="Search trims, narrow the field, and see what ownership may look like beyond the purchase price." action={<span className="small-stamp"><BookOpen size={16}/> {vehicles.data?.length ?? '—'} profiles</span>}/>{!canonicalResults && <DemoNotice/>}
    <div className="browse-layout"><aside className="filter-panel"><div className="filter-title"><SlidersHorizontal size={16}/> Refine research</div>
      <div className="browse-search-wrap" ref={searchBoxRef}><label className="field-label" htmlFor="browse-vehicle-search">Search</label><input id="browse-vehicle-search" data-testid="input-search-vehicles" className="browse-search-input" role="combobox" aria-autocomplete="list" aria-expanded={suggestionsOpen} aria-controls={suggestionsOpen && !catalogOptions.isLoading && !catalogOptions.isError && suggestions.length ? "browse-suggestions" : undefined} aria-activedescendant={activeSuggestion >= 0 ? `browse-suggestion-${activeSuggestion}` : undefined} value={draft} onFocus={() => setSuggestionsOpen(true)} onChange={event => { setDraft(event.target.value); setSuggestionsOpen(true); setActiveSuggestion(-1); }} onCompositionStart={() => setComposing(true)} onCompositionEnd={() => setComposing(false)} onKeyDown={handleSearchKeyDown} placeholder="Manufacturer or model"/>
        {suggestionsOpen && <div className="browse-suggestions" aria-live="polite">
          {catalogOptions.isLoading ? <div className="browse-suggestion-status" role="status">Loading catalog suggestions…</div> :
            catalogOptions.isError ? <div className="browse-suggestion-status" role="status">Catalog suggestions are unavailable. You can still search by text and use the existing filters. <button type="button" onMouseDown={event => event.preventDefault()} onClick={() => catalogOptions.refetch()}>Retry</button></div> :
              suggestions.length ? <div id="browse-suggestions" role="listbox" aria-label="Manufacturer and model suggestions">{suggestions.map((suggestion, index) => <button type="button" role="option" aria-selected={activeSuggestion === index} id={`browse-suggestion-${index}`} className={activeSuggestion === index ? "active" : ""} key={`${suggestion.kind}-${suggestion.kind === "model" ? suggestion.modelKey || suggestion.modelId : suggestion.makeSlug}`} onMouseDown={event => event.preventDefault()} onClick={() => selectSuggestion(suggestion)}><span>{suggestion.label}</span><small>{suggestion.kind === "manufacturer" ? "Manufacturer" : suggestion.profileKind === "canonical" ? "Canonical model" : "Model"}</small></button>)}</div> :
                draft.trim() ? <div className="browse-suggestion-status" role="status">No catalog suggestions. Press Enter to search this text.</div> :
                   <div className="browse-suggestion-status" role="status">Start typing to find a manufacturer or model.</div>}
        </div>}
      </div>
       {catalogOptions.isError && <div className="catalog-options-error" role="status">Catalog filters could not be loaded. Your URL filters are preserved; retry to load complete options. <button type="button" onClick={() => catalogOptions.refetch()}>Retry catalog</button></div>}
      {invalidHierarchyFilter && <div className="catalog-filter-mismatch" role="status">A saved vehicle filter does not match the available catalog. It remains active so results are not broadened; clear or change filters to continue.</div>}
       <label className="field-label">Manufacturer<select disabled={!catalogReady} value={browse.make} onChange={event => updateFilters({ make: event.target.value, model: "", modelId: "", modelKey: "", generationId: "", generationKey: "", year: "", trim: "", trimId: "", trimKey: "" })}><option value="">All manufacturers</option>{makeOptions.map(makeOption => <option value={makeOption.slug} key={makeOption.slug}>{makeOption.name}</option>)}</select></label>
       <label className="field-label">Model<select disabled={!catalogReady || !browse.make} value={browse.modelKey || browse.modelId} onChange={event => {
         const selectedOption = scoped.find(option => (option.profileKind === "canonical" ? catalogModelKey(option) : String(option.modelId)) === event.target.value);
         updateFilters({ model: "", modelId: selectedOption && selectedOption.profileKind !== "canonical" ? String(selectedOption.modelId) : "", modelKey: selectedOption?.profileKind === "canonical" ? catalogModelKey(selectedOption) : "", generationId: "", generationKey: "", year: "", trim: "", trimId: "", trimKey: "" });
       }}><option value="">All models</option>{modelOptions.map(option => <option value={option.value} key={option.value}>{option.name}</option>)}</select></label>
       <div className="field-label"><label htmlFor="browse-generation">Generation</label><GenerationSelect describedBy={generationHint ? "browse-generation-help" : undefined} disabled={!generationFilterEnabled} value={browse.generationKey || browse.generationId} options={generationOptions.map(option => ({ id: option.key || String(option.id), name: option.name }))} onChange={generationValue => {
         const selectedOption = selectedModelOptions.find(option => (option.profileKind === "canonical" ? catalogGenerationKey(option) : String(option.generationId)) === generationValue);
         updateFilters({ generationId: selectedOption && selectedOption.profileKind !== "canonical" ? String(selectedOption.generationId) : "", generationKey: selectedOption?.profileKind === "canonical" ? catalogGenerationKey(selectedOption) : "", year: "", trim: "", trimId: "", trimKey: "" });
       }}/>{generationHint && <small id="browse-generation-help" className="filter-help">{generationHint}</small>}</div>
       <label className="field-label">Model year<select disabled={!catalogReady} value={browse.year} onChange={event => updateFilters({ year: event.target.value, trim: "", trimId: "", trimKey: "" })}><option value="">All years</option>{yearOptions.map(option => <option value={option} key={option}>{option}</option>)}</select></label>
       <label className="field-label">Trim<select disabled={!catalogReady} value={browse.trimKey || browse.trimId} onChange={event => {
         const selectedOption = selectedYearOptions.find(option => (option.profileKind === "canonical" ? catalogTrimKey(option) : String(option.trimId)) === event.target.value);
         updateFilters({ trim: "", trimId: selectedOption && selectedOption.profileKind !== "canonical" ? String(selectedOption.trimId) : "", trimKey: selectedOption?.profileKind === "canonical" ? catalogTrimKey(selectedOption) : "" });
       }}><option value="">All trims</option>{trimOptions.map(option => <option value={option.value} key={option.value}>{option.name}</option>)}</select></label>
      <label className="field-label">Order by<select value={browse.sort} onChange={event => updateFilters({ sort: event.target.value as BrowseFilters["sort"] })}><option value="popular">Most popular</option><option value="reliability">Estimated reliability</option><option value="ownership-cost">Annual ownership cost</option></select></label>
      {(hasActiveBrowseFilters(browse) || draft.trim()) && <button className="clear-filters" onClick={clearAllFilters} aria-label="Clear all search filters">Clear all filters <X size={14}/></button>}<p className="filter-foot">Results are illustrative estimates, not independently verified guidance.</p></aside>
    <div className="results-area" ref={resultsAreaRef}><div className="results-top"><span>{vehicles.data?.length ?? 0} profiles shown</span><span className="mono">SORT: {browse.sort.replace('-', ' ').toUpperCase()}</span></div>
      {vehicles.isLoading ? <LoadingBlock/> : vehicles.isError ? <ErrorBlock retry={() => vehicles.refetch()}/> : !vehicles.data?.length ? <EmptyBlock/> : <div className="vehicle-grid browse-grid">{vehicles.data.map(v => <VehicleCard key={v.id} vehicle={v} onCompare={toggle} selected={selected.includes(v.id)}/>)}</div>}
    </div>
    </div>
    {selected.length > 0 && <div className="compare-dock"><span><b>{selected.length}</b> selected for comparison <small>Choose up to four vehicles</small></span><div>{selected.map(id => <button aria-label="Remove from comparison" key={id} onClick={() => setSelected(s => s.filter(x => x !== id))}><X size={13}/></button>)}</div><button className="button dark" onClick={() => setLoc(`/compare?ids=${selected.join(',')}`)}>Compare vehicles <ArrowRight size={15}/></button></div>}
  </div></Shell>;
}

function ManufacturerPage() {
  const { makeSlug = '' } = useParams();
  const profile = useGetMake(makeSlug);
  const manufacturerVehicles = profile.data?.vehicles || [];
  const canonicalProfiles = manufacturerVehicles.length > 0 && manufacturerVehicles.every(vehicle => vehicle.profileKind === "canonical" && !vehicle.isDemo);
  const demoProfiles = manufacturerVehicles.length > 0 && manufacturerVehicles.every(vehicle => vehicle.isDemo);
  const evidenceLabel = canonicalProfiles
    ? "CANONICAL RESEARCH"
    : demoProfiles
      ? "MANUFACTURER PROFILE · DEMO ESTIMATES"
      : "MIXED RESEARCH CATALOG";
  return <Shell><div className="content-wrap page-wrap">{profile.isLoading ? <LoadingBlock/> : profile.isError || !profile.data ? <ErrorBlock retry={() => profile.refetch()}/> : <><div className="manufacturer-hero"><span className="make-mark big">{profile.data.make.mark}</span><div><span className="eyebrow">{evidenceLabel}</span><h1 className="serif">{profile.data.make.name}</h1><p>{profile.data.description}</p></div><span className="manufacturer-count mono">{profile.data.make.vehicleCount} VEHICLE TRIMS</span></div>{!canonicalProfiles && <DemoNotice/>}<section className="content-section"><SectionHeading kicker="LINEUP SNAPSHOT" title={`Explore ${profile.data.make.name}`} link="Full catalog" href={`/browse?make=${makeSlug}`}/>{profile.data.vehicles.length ? <div className="vehicle-grid">{profile.data.vehicles.map(v => <VehicleCard key={v.id} vehicle={v}/>)}</div> : <EmptyBlock title="No featured trims yet" text="Browse the catalog to see all available vehicle profiles."/ >}</section></>}</div></Shell>;
}

function DetailPage() {
  const { vehicleId = '' } = useParams();
  const vehicle = useGetVehicle(vehicleId);
  const reports = useListOwnerReports({ vehicleId });
  const { activeSection, detailNavRef, navigateToSection } = useReportNavigation(vehicleId, Boolean(vehicle.data), reports.isLoading);
  const [loc, setLoc] = useLocation();
  if (vehicle.isLoading) return <Shell><div className="content-wrap page-wrap"><LoadingBlock/></div></Shell>;
  if (vehicle.isError || !vehicle.data) return <Shell><div className="content-wrap page-wrap"><ErrorBlock retry={() => vehicle.refetch()}/></div></Shell>;
  const v = vehicle.data;
  const canonical = v.profileKind === "canonical" && !v.isDemo;
  const researchState = (field: string, category?: string) => profileResearchState(v, field, category);
  const sectionState = (section: string) => v.sectionStates?.[section];
  const tabs = [
    ["overview", "Overview"],
    ["reliability", "Reliability"],
    ["external-owner-patterns", "External patterns"],
    ["costs", "Ownership costs"],
    ["reports", "Owner reports"],
  ];
  return <Shell><div className="content-wrap page-wrap">
    <div className="crumbs"><Link href="/">Home</Link><span>/</span><Link href={`/manufacturers/${v.makeSlug}`}>{v.make}</Link><span>/</span><span>{v.model}</span></div>
    <CanonicalProfileStatus vehicle={v} explain/>
    {canonical && <CanonicalEvidence state={v.fieldStates?.identity} claims={v.claims}/>}
    <div className="detail-hero"><div><span className="eyebrow">{v.year} · {v.generation} · {v.bodyType || (canonical ? "Body type not listed" : "")}</span><h1 className="serif">{v.make} {v.model}<br/><em>{v.trim}</em></h1>{canonical ? <><p>{v.overview || "No profile overview is available."}</p><CanonicalEvidence state={researchState("overview", "specifications")} claims={v.claims}/></> : <p>{v.overview}</p>}<div className="detail-actions"><button className="button dark" onClick={() => setLoc(`/compare?ids=${v.id}`)}>Compare this trim <ArrowRight size={15}/></button><button className="button secondary" onClick={() => setLoc(`/calculator?vehicle=${v.id}`)}><Calculator size={15}/> Estimate my costs</button></div></div><div className="detail-score"><span className="eyebrow">RELIABILITY ESTIMATE</span>{canonical ? <><CanonicalEvidence state={researchState("reliabilityEstimate", "reliability")} claims={v.claims}/>{v.reliability.score != null && <b>{v.reliability.score} / 10</b>}{v.reliability.label && <b>{v.reliability.label}</b>}{v.reliability.note && <small>{v.reliability.note}</small>}</> : <><Reliability score={v.reliability.score} size="large"/><b>{v.reliability.label}</b><small>{v.reliability.note}</small><span className="demo-tag">DEMO / ESTIMATE</span></>}</div></div>
    {!canonical && <DemoNotice/>}
    <div className="spec-strip">{[[v.mpgCombined == null ? "—" : `${v.mpgCombined} ${economyUnit(v.fuelType || "")}`, 'COMBINED EST.'], [v.drivetrain || "—", 'DRIVETRAIN'], [v.fuelType || "—", 'FUEL'], [v.horsepower == null ? "—" : `${v.horsepower} hp`, 'POWER'], [money(v.priceUsd), 'STARTING EST.']].map(([val, caption]) => <div key={caption}><b>{val}</b><small>{canonical ? caption === "STARTING EST." ? "PRICE" : caption === "COMBINED EST." ? "COMBINED ECONOMY" : caption : caption}</small>{canonical && <CanonicalEvidence state={researchState(caption === "STARTING EST." ? "priceUsd" : caption === "COMBINED EST." ? "mpgCombined" : caption === "DRIVETRAIN" ? "drivetrain" : caption === "FUEL" ? "fuelType" : "horsepower", "specifications")} claims={v.claims}/>}</div>)}</div>
    <div className="detail-body"><nav className="detail-tabs" aria-label="Vehicle report sections" ref={detailNavRef}>{tabs.map(([id, title]) => <a href={`#${id}`} onClick={event => { if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); navigateToSection(id as ReportSectionId); }} className={activeSection === id ? "active" : ""} aria-current={activeSection === id ? "location" : undefined} key={id}>{title}</a>)}</nav>
    <div className="detail-columns">
      <div className="detail-main">
         <section id="overview" className="detail-section"><span className="eyebrow">01 / POWERTRAIN & TRIM</span><h2 className="serif">What this vehicle is.</h2>{canonical ? <><CanonicalEvidence state={sectionState("specifications")} claims={v.claims}/>{v.overview?.split("\n\n").map((paragraph, index) => <p className="body-copy" key={index}>{paragraph}</p>)}</> : <p className="body-copy">This profile represents the {v.year} {v.make} {v.model} {v.trim} in the {v.generation}. Specifications and availability vary by market and configuration; confirm against the original window sticker and manufacturer documentation.</p>}<div className="powertrain-grid"><div><span className="eyebrow">FEATURED ENGINE</span><h3>{v.engineName || "—"}</h3>{canonical && <CanonicalEvidence state={researchState("engineName", "specifications")} claims={v.claims}/ >}{v.engines.map((e, index) => <p className="option-line" key={`${e.name}-${index}`}><b>{e.name}</b><span>{e.horsepower == null ? "—" : `${e.horsepower} hp`} · {e.fuelType || "—"}</span><small>{e.availability || "—"}</small>{canonical && <CanonicalEvidence claimIds={e.claimIds} claims={v.claims}/>}</p>)}</div><div><span className="eyebrow">FEATURED TRANSMISSION</span><h3>{v.transmissionName || "—"}</h3>{canonical && <CanonicalEvidence state={researchState("transmissionName", "specifications")} claims={v.claims}/ >}{v.transmissions.map(t => <p className="option-line" key={t.name}><b>{t.name}</b><span>{t.gears || "—"}</span><small>{t.availability || "—"}</small>{canonical && <CanonicalEvidence claimIds={t.claimIds} claims={v.claims}/>}</p>)}</div></div>
           {canonical && <div className="trim-note">
             <span className="eyebrow">FUEL SPECIFICATIONS / U.S. OWNER'S MANUAL</span>
             <p className="body-copy"><b>Fuel requirement:</b> {v.fuelRequirement || "—"}</p>
             <CanonicalEvidence state={researchState("fuelRequirement", "specifications")} claims={v.claims}/>
             <p className="body-copy"><b>Advertised fuel-tank capacity:</b> {v.fuelTankCapacityGallons == null ? "—" : `${v.fuelTankCapacityGallons} U.S. gal`}</p>
             <CanonicalEvidence state={researchState("fuelTankCapacityGallons", "specifications")} claims={v.claims}/>
           </div>}
           {!canonical && <div className="trim-note"><span className="eyebrow">SIBLING TRIMS</span><div>{v.siblingTrims.map(trim => <span className="pill" key={trim}>{trim}</span>)}</div></div>}</section>
         <section id="reliability" className="detail-section"><span className="eyebrow">02 / PATTERNS, NOT PROMISES</span><h2 className="serif">Reliability, with context.</h2>{canonical ? <><CanonicalEvidence state={sectionState("reliability")} claims={v.claims}/><div className="reliability-panel">{v.reliability.score != null && <b>{v.reliability.score} / 10</b>}<div>{v.reliability.label && <h3>{v.reliability.label}</h3>}{v.reliability.note && <p>{v.reliability.note}</p>}<CanonicalEvidence state={researchState("reliabilityEstimate", "reliability")} claims={v.claims}/></div></div></> : <div className="reliability-panel"><Reliability score={v.reliability.score} size="large"/><div><h3>{v.reliability.label}</h3><p>{v.reliability.note}</p><small>Illustrative score out of 10; not a prediction or verified reliability rating.</small></div></div>}<h3 className="subhead">Reported problem areas</h3>{v.commonProblems.length ? v.commonProblems.map((p) => <div className="problem-row" key={p.title}><span className={`severity severity-${(p.severity || "unknown").toLowerCase()}`}>{p.severity || "—"}</span><div><h4>{p.title}</h4><p>{p.description}</p><small className={`problem-applicability ${p.applicability === "unknown" ? "unknown" : ""}`}>{p.applicability === "applies" ? "Listed for this selected engine" : p.applicability === "does_not_apply" ? "Does not apply to this configuration" : "Engine applicability unknown — confirm the exact configuration"}</small>{canonical && <CanonicalEvidence claimIds={p.claimIds} claims={v.claims}/>}<small>Typical range: {p.typicalMileageStart == null ? "—" : p.typicalMileageStart.toLocaleString()}–{p.typicalMileageEnd == null ? "—" : p.typicalMileageEnd.toLocaleString()} miles</small></div><b>{money(p.repairCostLowUsd)}–{money(p.repairCostHighUsd)}<small>repair estimate</small></b></div>) : canonical ? <CanonicalEvidence state={researchState("knownIssues")} claims={v.claims}/> : <EmptyBlock title="No problem patterns listed" text="This demo profile has no illustrative problem records."/>}</section>
         <section id="external-owner-patterns" className="detail-section"><span className="eyebrow">SOURCE-BACKED RESEARCH</span><h2 className="serif">External owner patterns.</h2>{canonical ? <ExternalOwnerPatterns patterns={v.externalOwnerPatterns} state={sectionState("externalOwnerPatterns")} claims={v.claims}/> : <p className="body-copy">External patterns are not included in this illustrative demo profile.</p>}</section>
         <section id="costs" className="detail-section"><span className="eyebrow">03 / THE COST OF KEEPING IT</span><h2 className="serif">Ownership costs, itemized.</h2>{canonical && <CanonicalEvidence state={sectionState("ownership")} claims={v.claims}/>}<div className="cost-summary"><div><span>ANNUAL OWNERSHIP EST.</span><b>{money(v.annualOwnershipEstimateUsd)}</b>{canonical && <CanonicalEvidence state={researchState("annualOwnershipEstimateUsd", "ownership")} claims={v.claims}/>}</div><div><span>MAINTENANCE / YEAR</span><b>{money(v.annualMaintenanceEstimateUsd)}</b>{canonical && <CanonicalEvidence state={researchState("annualMaintenanceEstimateUsd", "ownership")} claims={v.claims}/>}</div><div><span>REPAIRS / YEAR</span><b>{money(v.annualRepairEstimateUsd)}</b>{canonical && <CanonicalEvidence state={researchState("annualRepairEstimateUsd", "ownership")} claims={v.claims}/>}</div><div><span>FUEL / YEAR</span><b>{money(v.annualFuelEstimateUsd)}</b>{canonical && <CanonicalEvidence state={researchState("annualFuelEstimateUsd", "ownership")} claims={v.claims}/>}</div><div><span>INSURANCE / YEAR</span><b>{money(v.insuranceEstimateUsd)}</b>{canonical && <CanonicalEvidence state={researchState("insuranceEstimateUsd", "ownership")} claims={v.claims}/>}</div></div><h3 className="subhead">Routine maintenance estimates</h3>{v.maintenance.map(m => <div className="maintenance-row" key={m.item}><Wrench size={16}/><b>{m.item}</b><span>{m.intervalMiles == null ? "—" : `Every ${m.intervalMiles.toLocaleString()} miles`}</span><strong>{money(m.estimatedCostUsd)}</strong>{canonical && <CanonicalEvidence claimIds={m.claimIds} claims={v.claims}/>}</div>)}{canonical && !v.maintenance.length && <CanonicalEvidence state={researchState("maintenance")} claims={v.claims}/>}<div className="depreciation-panel"><div><span className="eyebrow">FIVE-YEAR VALUE CHANGE</span><b>{v.fiveYearDepreciationPercent == null ? "—" : `${v.fiveYearDepreciationPercent}%`}</b>{!canonical && <small>illustrative depreciation estimate</small>}{canonical && <CanonicalEvidence state={researchState("fiveYearDepreciationPercent", "ownership")} claims={v.claims}/>}</div><div><span className="eyebrow">EXPECTED LIFESPAN</span><b>{v.expectedLifespanMiles == null ? "—" : v.expectedLifespanMiles.toLocaleString()} <small>miles</small></b>{!canonical && <small>not a guarantee</small>}{canonical && <CanonicalEvidence state={researchState("expectedLifespanMiles", "ownership")} claims={v.claims}/>}</div></div></section>
         <section className="detail-section"><span className="eyebrow">04 / BEFORE YOU BUY</span><h2 className="serif">{canonical ? "Inspection research" : "A practical inspection list."}</h2>{canonical ? <><CanonicalEvidence state={sectionState("inspectionChecklist")} claims={v.claims}/>{sectionState("inspectionChecklist")?.state === "known" && v.inspectionChecklist.length > 0 && <div className="checklist">{v.inspectionChecklist.map(item => <label key={item}><input type="checkbox"/><span>{item}</span></label>)}</div>}</> : <><p className="body-copy">A pre-purchase inspection by an independent mechanic is worth the time. Use this as a starting point, not a substitute.</p><div className="checklist">{v.inspectionChecklist.map(item => <label key={item}><input type="checkbox"/><span>{item}</span></label>)}</div></>}</section>
         <section id="reports" className="detail-section"><span className="eyebrow">05 / OWNER EXPERIENCES</span><h2 className="serif">Life with this vehicle.</h2>{canonical ? <CanonicalEvidence state={sectionState("ownerReports")} claims={v.claims}/> : <p className="body-copy">Owner reports are sample stories for demonstration. They do not establish population-wide reliability.</p>}{reports.isLoading ? <LoadingBlock/> : reports.isError ? <ErrorBlock retry={() => reports.refetch()}/> : (reports.data || []).filter(r => !canonical || !r.isDemo).length ? (reports.data || []).filter(r => !canonical || !r.isDemo).map(r => <article className="report-card" key={r.id}><div className="report-heading"><span className="avatar-initial">{r.displayName.slice(0, 1)}</span><div><b>{r.displayName}</b><small>{r.ownershipMonths ?? "—"} months · {r.milesDriven == null ? "—" : r.milesDriven.toLocaleString()} miles</small></div><span className="report-rating">{r.rating == null ? "—" : `${r.rating.toFixed(1)} / 5`}</span></div><h3>{r.title}</h3><p>{r.body}</p>{r.reportedProblem && <div className="reported-problem"><Wrench size={14}/> Reported issue: {r.reportedProblem}</div>}{canonical ? <CanonicalEvidence claimIds={r.claimIds} claims={v.claims}/> : <span className="demo-tag">SAMPLE OWNER REPORT</span>}</article>) : canonical ? <CanonicalEvidence state={sectionState("ownerReports")} claims={v.claims}/> : <EmptyBlock title="No owner reports yet" text="There are no sample experiences associated with this trim."/ >}</section>
      </div>
      <aside className="detail-aside"><div className="aside-card"><span className="eyebrow"><Shield size={14}/> SAFETY & RECALLS</span><h3>Verify directly.</h3><p>Safety ratings and open recalls change. Always check this exact VIN with official sources before buying.</p><div className="status-line"><span>{canonical ? "Recall status" : "Demo recall status"}</span><b>{v.recallStatus || "—"}</b></div>{canonical && <CanonicalEvidence state={researchState("recallStatus")} claims={v.claims}/>}<div className="status-line"><span>{canonical ? "Safety status" : "Demo safety status"}</span><b>{v.safetyStatus || "—"}</b></div>{canonical && <CanonicalEvidence state={researchState("safetyStatus")} claims={v.claims}/>}<a className="official-link" href="https://www.nhtsa.gov/recalls" target="_blank" rel="noreferrer">Check recalls at NHTSA <ArrowUpRight size={14}/></a><a className="official-link" href="https://www.nhtsa.gov/ratings" target="_blank" rel="noreferrer">NHTSA safety ratings <ArrowUpRight size={14}/></a></div><div className="aside-card cost-callout"><Calculator size={19}/><h3>Make it personal.</h3><p>Adjust the assumptions to estimate a monthly cost that fits your driving.</p><Link href={`/calculator?vehicle=${v.id}`} className="text-link">Open calculator <ArrowRight size={15}/></Link></div>{!canonical && <div className="aside-note"><Info size={15}/><span>All figures on this page are DEMO / ESTIMATE values. Confirm specifications, maintenance schedules, and safety details with the manufacturer and official sources.</span></div>}</aside>
    </div>
    </div>
  </div></Shell>;
}

function ComparePage() {
  const [, setLoc] = useLocation();
  const [ids, setIds] = useState(() => parseComparisonIds(window.location.search));
  const catalog = useListVehicles({ limit: 100 });
  const [search, setSearch] = useState('');
  useEffect(() => {
    const syncIdsFromUrl = () => {
      setIds(parseComparisonIds(window.location.search));
      setSearch('');
    };
    window.addEventListener('popstate', syncIdsFromUrl);
    return () => window.removeEventListener('popstate', syncIdsFromUrl);
  }, []);
  const selected = ids.map(id => {
    // Query each selected vehicle by ID below; catalog provides convenient quick-add options.
    return id;
  });
  const remove = (id: string) => { const next = removeComparisonId(ids, id); setIds(next); setLoc(buildComparisonLocation(next)); };
  const add = (id: string) => {
    const next = addComparisonId(ids, id);
    if (next !== ids) {
      setIds(next);
      setLoc(buildComparisonLocation(next));
      setSearch('');
    }
  };
  const atLimit = ids.length >= 4;
  const showSuggestions = Boolean(search.trim()) && !atLimit;
  const matches = (catalog.data || []).filter(v => `${v.make} ${v.model} ${v.year}`.toLowerCase().includes(search.toLowerCase()) && !ids.includes(v.id)).slice(0, 5);
  const canonicalComparison = ids.length > 0 && ids.every(id => catalog.data?.find(v => v.id === id)?.profileKind === "canonical");
  return <Shell><div className="content-wrap page-wrap"><PageIntro eyebrow="SIDE BY SIDE" title="Compare what ownership feels like." sub="Line up up to four vehicles. Estimates are useful for framing questions—not declaring a winner."/>{!canonicalComparison && <DemoNotice/>}<div className="compare-picker"><div className="picker-search"><Search size={16}/><input aria-label="Add a vehicle by make or model" aria-describedby="comparison-selection-status" placeholder="Add a vehicle by make or model" value={search} disabled={atLimit} onChange={e => setSearch(e.target.value)}/></div>{showSuggestions && <div className="picker-results">{catalog.isLoading ? <span>Loading vehicles…</span> : catalog.isError ? <span>Vehicle choices couldn't load. Please refresh to try again.</span> : matches.length ? matches.map(v => <button key={v.id} onClick={() => add(v.id)}>{label(v)} <span>{money(v.annualOwnershipEstimateUsd)} / yr est.</span><ArrowRight size={14}/></button>) : <span>No matching vehicles. Try another make or model.</span>}</div>}<span id="comparison-selection-status" className={`picker-count${atLimit ? ' at-limit' : ''}`} role="status">{ids.length} of 4 vehicles selected{atLimit && <small>Remove a vehicle to add another.</small>}</span></div>
    {ids.length === 0 ? <EmptyBlock title="Start your comparison" text="Search above or browse the catalog to add vehicles. Your selection stays in this URL so it is easy to revisit."/> : <div className="compare-table-wrap"><table className="compare-table"><thead><tr><th>Research point</th>{selected.map(id => <CompareColumn key={id} id={id} onRemove={remove}/>)}</tr></thead><tbody>
       <CompareRow label="Vehicle" render={d => `${d.year} ${d.make} ${d.model} ${d.trim}`}/><CompareRow label="Generation" render={d => d.generation}/><CompareRow label="Estimated reliability" field="reliabilityEstimate" render={d => d.reliability.score == null ? d.reliability.label || "—" : `${d.reliability.score.toFixed(1)} / 10${d.reliability.label ? ` · ${d.reliability.label}` : ""}`}/><CompareRow label="Annual ownership estimate" field="annualOwnershipEstimateUsd" render={d => money(d.annualOwnershipEstimateUsd)}/><CompareRow label="Maintenance / year" field="annualMaintenanceEstimateUsd" render={d => money(d.annualMaintenanceEstimateUsd)}/><CompareRow label="Repairs / year" field="annualRepairEstimateUsd" render={d => money(d.annualRepairEstimateUsd)}/><CompareRow label="Fuel / year" field="annualFuelEstimateUsd" render={d => money(d.annualFuelEstimateUsd)}/><CompareRow label="Insurance / year" field="insuranceEstimateUsd" render={d => money(d.insuranceEstimateUsd)}/><CompareRow label="Combined fuel economy" field="mpgCombined" render={d => d.mpgCombined == null ? "—" : `${d.mpgCombined} ${economyUnit(d.fuelType || "")}`}/><CompareRow label="Powertrain" field="engineName" render={d => `${d.engineName || "—"} · ${d.transmissionName || "—"}`}/><CompareRow label="Five-year depreciation" field="fiveYearDepreciationPercent" render={d => d.fiveYearDepreciationPercent == null ? "—" : `${d.fiveYearDepreciationPercent}%`}/><CompareRow label="Expected lifespan" field="expectedLifespanMiles" render={d => d.expectedLifespanMiles == null ? "—" : `${d.expectedLifespanMiles.toLocaleString()} miles`}/><CompareRow label="Open recalls / safety" field="recallStatus" render={d => `Recall: ${d.recallStatus || "—"} · Safety: ${d.safetyStatus || "—"}`}/>
    </tbody></table></div>}
    <p className="compare-foot"><Info size={15}/>Compare like-for-like years and trims where possible. Local market, condition, driving habits and repair history can outweigh broad estimates.</p>
  </div></Shell>;
}

function CompareColumn({ id, onRemove }: { id: string; onRemove: (id: string) => void }) {
  const v = useGetVehicle(id);
  return <th>{v.isLoading ? <span className="skeleton compact-skeleton"/> : v.isError || !v.data ? <span>Profile unavailable</span> : <div className="compare-vehicle"><Link href={`/vehicles/${id}`} className="serif">{v.data.make} {v.data.model}</Link><small>{v.data.year} · {v.data.trim}</small><CanonicalProfileStatus vehicle={v.data}/><button onClick={() => onRemove(id)} aria-label="Remove vehicle"><X size={14}/> Remove</button></div>}</th>;
}
function CompareRow({ label: rowLabel, field, render }: { label: string; field?: string; render: (d: VehicleDetail) => string }) {
  const ids = new URLSearchParams(window.location.search).get('ids')?.split(',').filter(Boolean) || [];
  return <tr><th>{rowLabel}</th>{ids.map(id => <CompareCell key={id} id={id} field={field} render={render}/>)}</tr>;
}
function CompareCell({ id, field, render }: { id: string; field?: string; render: (d: VehicleDetail) => string }) {
  const { data } = useGetVehicle(id);
  const canonical = data?.profileKind === "canonical" && !data.isDemo;
  const category = field === "reliabilityEstimate" ? "reliability" :
    ["annualOwnershipEstimateUsd", "annualMaintenanceEstimateUsd", "annualRepairEstimateUsd", "annualFuelEstimateUsd", "insuranceEstimateUsd", "fiveYearDepreciationPercent", "expectedLifespanMiles"].includes(field || "") ? "ownership" :
      ["mpgCombined", "engineName"].includes(field || "") ? "specifications" :
        field === "recallStatus" ? "recalls" : undefined;
  const evidenceFields = field === "engineName"
    ? [["Engine", "engineName", "specifications"], ["Transmission", "transmissionName", "specifications"]]
    : field === "recallStatus"
      ? [["Recall", "recallStatus", "recalls"], ["Safety", "safetyStatus", "safety"]]
      : field === "reliabilityEstimate"
        ? [["Score", "reliabilityEstimate", "reliability"], ["Assessment", "reliability.label", "reliability"], ["Context", "reliability.note", "reliability"]]
        : field ? [["", field, category]] : [];
  return <td>{data ? <>{render(data)}{canonical && evidenceFields.map(([caption, researchField, section]) => <div key={researchField}>{caption && <small>{caption}</small>}<CanonicalEvidence state={profileResearchState(data, researchField!, section)} claims={data.claims}/></div>)}</> : <span className="muted">—</span>}</td>;
}

function CalculatorPage() {
  const params = new URLSearchParams(window.location.search);
  const vehicleId = params.get('vehicle') || '';
  const vehicle = useGetVehicle(vehicleId, { query: optionalVehicleQueryOptions(vehicleId, getGetVehicleQueryKey(vehicleId)) });
  const defaults: OwnershipDraft = {
    price: '32000', down: '5000', apr: '6.4', miles: '12000', mpg: '28',
    gas: '3.65', electricity: '16', insurance: '145', maintenance: '110', repairs: '55',
  };
  const [draft, setDraft] = useState<OwnershipDraft>({
    ...defaults,
  });
  const [shopperEditedFields, setShopperEditedFields] = useState<Partial<Record<keyof OwnershipDraft, boolean>>>({});
  const [prefilledFields, setPrefilledFields] = useState<Partial<Record<keyof OwnershipDraft, boolean>>>({});
  const [shopperEnergyBasis, setShopperEnergyBasis] = useState("");
  const [prefilledProfileId, setPrefilledProfileId] = useState('');
  const [term, setTerm] = useState(60);
  const [stateCode, setStateCode] = useState('');
  const [taxRate, setTaxRate] = useState('0');
  const [taxRateEdited, setTaxRateEdited] = useState(false);
  const [dealerFees, setDealerFees] = useState('0');
  const [dealerFeesEdited, setDealerFeesEdited] = useState(false);
  const [taxMode, setTaxMode] = useState<'financed' | 'upfront'>('financed');
  const vehicleProfile = vehicle.data?.id === vehicleId ? vehicle.data : undefined;
  const canonical = vehicleProfile?.profileKind === "canonical" && !vehicleProfile.isDemo;
  const canonicalCalculatorMode = canonical || (Boolean(vehicleId) && !vehicleProfile);
  const previousProfileId = useRef('');
  useEffect(() => {
    if (!vehicleProfile) return;
    if (previousProfileId.current && previousProfileId.current !== vehicleProfile.id) {
      setDraft(current => resetUneditedCalculatorDraft(current, defaults, shopperEditedFields));
      setPrefilledFields({});
      setPrefilledProfileId('');
    }
    previousProfileId.current = vehicleProfile.id;
  }, [vehicleProfile?.id]);
  const displayDraft = Object.fromEntries((Object.keys(draft) as Array<keyof OwnershipDraft>).map(field => [
    field,
    shopperEditedFields[field] ? draft[field] :
      canonicalCalculatorMode
        ? prefilledFields[field] && prefilledProfileId === vehicleProfile?.id ? draft[field] : ""
        : prefilledFields[field] && prefilledProfileId && prefilledProfileId !== vehicleProfile?.id ? defaults[field] : draft[field],
  ])) as OwnershipDraft;
  const displayTaxRate = canonicalCalculatorMode && !taxRateEdited ? "" : taxRate;
  const displayDealerFees = canonicalCalculatorMode && !dealerFeesEdited ? "" : dealerFees;
  const numbers = readOwnershipDraft(displayDraft);
  const { insurance, maintenance, repairs } = numbers;
  const normalizedFuelType = vehicleProfile?.fuelType?.trim().toLocaleLowerCase();
  const fuelTypeKnown = !canonicalCalculatorMode || Boolean(
    normalizedFuelType &&
    vehicleProfile?.fieldStates?.fuelType?.state === "known" &&
    !["unknown", "not known", "unspecified"].includes(normalizedFuelType),
  );
  const calculationEnergyBasis = fuelTypeKnown ? vehicleProfile?.fuelType : shopperEnergyBasis;
  const energyBasisSelected = fuelTypeKnown || Boolean(shopperEnergyBasis);
  const vehicleIsElectric = Boolean(vehicleId) && energyBasisSelected && economyUnit(calculationEnergyBasis || "") === "MPGe";
  const financing = calculateFinancingEstimate({ price: numbers.price, down: numbers.down, apr: numbers.apr, term, salesTaxRate: parseCalculatorNumber(displayTaxRate), dealerFees: parseCalculatorNumber(displayDealerFees), taxesAndFeesPayment: taxMode });
  const { fuel } = calculateOwnershipEstimate({ ...numbers, mpg: energyBasisSelected ? numbers.mpg : 0, price: financing.amountFinanced, down: 0, term, vehicleIsElectric });
  const calculatorAssumptions = { draft: displayDraft, taxRate: displayTaxRate, dealerFees: displayDealerFees, fuelType: calculationEnergyBasis };
  const missingFinance = missingCanonicalFinancingInputs(calculatorAssumptions);
  const financingReady = missingFinance.length === 0;
  const fuelInputsReady = energyBasisSelected && isEnteredCalculatorValue(displayDraft.miles) &&
    isEnteredCalculatorValue(displayDraft.mpg) && numbers.mpg > 0 &&
    (vehicleIsElectric ? isEnteredCalculatorValue(displayDraft.electricity) : isEnteredCalculatorValue(displayDraft.gas));
  const payment = financing.monthlyLoanPayment;
  const energyLabel = vehicleIsElectric ? "Electricity cost" : "Fuel cost";
  const energyMissingMessage = !energyBasisSelected
    ? "Choose an energy basis to estimate energy cost."
    : !isEnteredCalculatorValue(displayDraft.miles)
      ? "Add annual mileage to estimate energy cost."
      : !isEnteredCalculatorValue(displayDraft.mpg)
        ? "Add combined fuel economy to estimate energy cost."
        : numbers.mpg === 0
          ? "Enter fuel economy greater than 0 to estimate energy cost."
          : vehicleIsElectric
            ? "Add electricity price to estimate energy cost."
            : "Add fuel price to estimate energy cost.";
  const monthlyCosts = summarizeMonthlyOwnershipCosts([
    { label: "Loan payment", monthlyAmount: financingReady ? payment : null },
    { label: energyLabel, monthlyAmount: fuelInputsReady ? fuel : null },
    { label: "Insurance", monthlyAmount: isEnteredCalculatorValue(displayDraft.insurance) ? insurance : null },
    { label: "Maintenance", monthlyAmount: isEnteredCalculatorValue(displayDraft.maintenance) ? maintenance : null },
    { label: "Repair reserve", monthlyAmount: isEnteredCalculatorValue(displayDraft.repairs) ? repairs : null },
  ]);
  const hasMonthlyEstimate = monthlyCosts.total !== null;
  const monthly = monthlyCosts.total ?? 0;
  const chooseState = (code: string) => { setStateCode(code); setTaxRateEdited(Boolean(code)); setTaxRate(code ? String(STATE_TAX_ESTIMATES.find(x => x.code === code)?.rate ?? 0) : canonicalCalculatorMode ? "" : "0"); };
  const currency = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
  const setField = (field: keyof OwnershipDraft) => (value: string) => {
    setShopperEditedFields(current => ({ ...current, [field]: true }));
    setPrefilledFields(current => ({ ...current, [field]: false }));
    setDraft(current => ({ ...current, [field]: value }));
  };
  const setTaxRateField = (value: string) => {
    setTaxRateEdited(true);
    setTaxRate(value);
  };
  const setDealerFeesField = (value: string) => {
    setDealerFeesEdited(true);
    setDealerFees(value);
  };
  const canonicalPrefillFields = {
    ...shopperEditedFields,
    ...(prefilledProfileId === vehicleProfile?.id
      ? Object.fromEntries((Object.keys(prefilledFields) as Array<keyof OwnershipDraft>).filter(field => prefilledFields[field]).map(field => [field, true]))
      : {}),
  };
  const canonicalPrefill = canonical && vehicleProfile
    ? mergeCanonicalCalculatorPrefill(vehicleProfile, draft, canonicalPrefillFields)
    : undefined;
  const displayedMonthly = hasMonthlyEstimate ? currency(monthly) : "Not calculated";
  const monthlyLine = (field: keyof OwnershipDraft, value: number, label: string) =>
    isEnteredCalculatorValue(displayDraft[field]) ? currency(value) : `Add monthly ${label}.`;
  const paymentLine = financingReady
    ? currency(payment)
    : `Add ${missingFinance.join(", ")} to calculate loan payment.`;
  const energyLine = fuelInputsReady ? currency(fuel) : energyMissingMessage;
  const resultLines: Array<[string, string]> = [
    ["Loan payment", paymentLine],
    [energyLabel, energyLine],
    ["Insurance", monthlyLine("insurance", insurance, "insurance")],
    ["Maintenance", monthlyLine("maintenance", maintenance, "maintenance")],
    ["Repair reserve", monthlyLine("repairs", repairs, "repairs reserve")],
  ];
  const prefillCanonical = () => {
    const profile = vehicleProfile;
    if (!profile || !canonical) return;
    const merged = mergeCanonicalCalculatorPrefill(profile, draft, canonicalPrefillFields);
    if (!merged.appliedFields.length) return;
    setPrefilledFields(current => ({ ...current, ...Object.fromEntries(merged.appliedFields.map(field => [field, true])) }));
    setPrefilledProfileId(profile.id);
    setDraft(merged.draft);
  };
  return <Shell><div className="content-wrap page-wrap"><PageIntro eyebrow="OWNERSHIP ESTIMATOR" title="Put your own numbers in." sub="A transparent estimate for monthly and yearly costs. Change any assumption to see the whole picture move."/>{!canonicalCalculatorMode && <DemoNotice/>}
    {vehicleProfile && <CanonicalProfileStatus vehicle={vehicleProfile}/>}
    {vehicleId && vehicleProfile && <div className="prefill-banner"><Check size={15}/> Starting with {canonical ? "known profile data for" : "estimates for"} <b>{vehicleProfile.year} {vehicleProfile.make} {vehicleProfile.model} {vehicleProfile.trim}</b><button disabled={canonical && !canonicalPrefill?.appliedFields.length} onClick={() => {
      const profile = vehicleProfile;
      if (profile.profileKind === "canonical" && !profile.isDemo) {
        prefillCanonical();
      } else {
        const sourceValues: Partial<OwnershipDraft> = {
          price: String(profile.priceUsd ?? ""),
          ...(profile.insuranceEstimateUsd == null ? {} : { insurance: String(profile.insuranceEstimateUsd / 12) }),
          ...(profile.annualMaintenanceEstimateUsd == null ? {} : { maintenance: String(profile.annualMaintenanceEstimateUsd / 12) }),
          ...(profile.mpgCombined == null ? {} : { mpg: String(profile.mpgCombined) }),
        };
        const sourceFields = Object.keys(sourceValues) as Array<keyof OwnershipDraft>;
        setDraft(current => ({ ...current, ...sourceValues }));
        setShopperEditedFields(current => ({ ...current, ...Object.fromEntries(sourceFields.map(field => [field, false])) }));
        setPrefilledFields(current => ({ ...current, ...Object.fromEntries(sourceFields.map(field => [field, true])) }));
        setPrefilledProfileId(profile.id);
      }
    }}>{canonical ? "Use known profile values" : "Use vehicle profile estimates"}</button></div>}
    <div className="calculator-layout"><div className="calculator-form">
      <section className="calc-group"><span className="eyebrow">01 / FINANCING</span><h2 className="serif">Purchase assumptions</h2><div className="input-grid"><NumberField label="Vehicle price" value={displayDraft.price} set={setField('price')} prefix="$" normalizeOnBlur={!canonicalCalculatorMode}/><NumberField label="Down payment" value={displayDraft.down} set={setField('down')} prefix="$" normalizeOnBlur={!canonicalCalculatorMode}/><NumberField label="APR" value={displayDraft.apr} set={setField('apr')} suffix="%" normalizeOnBlur={!canonicalCalculatorMode}/><label className="field-label">Loan term<select value={term} onChange={e => setTerm(Number(e.target.value))}><option value="36">36 months</option><option value="48">48 months</option><option value="60">60 months</option><option value="72">72 months</option><option value="84">84 months</option></select></label><label className="field-label">State (for sales tax estimate)<select aria-label="State" data-testid="select-state" value={stateCode} onChange={e => chooseState(e.target.value)}><option value="">Select a state</option>{STATE_TAX_ESTIMATES.map(x => <option key={x.code} value={x.code}>{x.name}</option>)}</select></label><NumberField label="Estimated sales tax rate (editable)" value={displayTaxRate} set={setTaxRateField} suffix="%" normalizeOnBlur={!canonicalCalculatorMode}/><NumberField label="Estimated dealer fees" value={displayDealerFees} set={setDealerFeesField} prefix="$" normalizeOnBlur={!canonicalCalculatorMode}/></div>
        <p className="field-hint">Prototype state-level estimates, not official. Local taxes, trade-ins, exemptions and registration location change the real rate. Dealer fees vary by dealer.</p>
        <fieldset className="segmented" data-testid="group-taxes-fees"><legend>Taxes &amp; fees payment</legend><button type="button" className={taxMode === 'financed' ? 'on' : ''} aria-pressed={taxMode === 'financed'} onClick={() => setTaxMode('financed')}>Include taxes &amp; fees in loan</button><button type="button" className={taxMode === 'upfront' ? 'on' : ''} aria-pressed={taxMode === 'upfront'} onClick={() => setTaxMode('upfront')}>Pay taxes &amp; fees upfront</button></fieldset>
         {financingReady ? <PurchaseBreakdown f={financing}/> : <p className="field-hint" role="status">Add {missingFinance.join(", ")} to calculate the purchase breakdown.</p>}</section>
      <section className="calc-group"><span className="eyebrow">02 / YOUR DRIVING</span><h2 className="serif">Fuel assumptions</h2><div className="input-grid">
        {canonicalCalculatorMode && !fuelTypeKnown && <label className="field-label">Your energy basis<select aria-label="Your energy basis" value={shopperEnergyBasis} onChange={event => setShopperEnergyBasis(event.target.value)}><option value="">Choose an assumption</option><option value="gasoline">Fuel (MPG)</option><option value="electric">Electricity (MPGe)</option></select><small>This is your calculation assumption, not a researched vehicle fact.</small></label>}
        <NumberField label="Miles driven per year" value={displayDraft.miles} set={setField('miles')} suffix="mi" normalizeOnBlur={!canonicalCalculatorMode}/>
        <NumberField label={canonicalCalculatorMode && !energyBasisSelected ? "Combined fuel economy (unit unknown)" : "Combined fuel economy"} value={displayDraft.mpg} set={setField('mpg')} suffix={canonicalCalculatorMode && !energyBasisSelected ? undefined : vehicleIsElectric ? 'MPGe' : 'mpg'} normalizeOnBlur={!canonicalCalculatorMode}/>
        {canonicalCalculatorMode && !fuelTypeKnown && <CanonicalEvidence state={vehicleProfile?.fieldStates?.fuelType} claims={vehicleProfile?.claims}/>}
        {energyBasisSelected && (vehicleIsElectric ? <NumberField label="Electricity price" value={displayDraft.electricity} set={setField('electricity')} suffix="¢/kWh" normalizeOnBlur={!canonicalCalculatorMode}/> : <NumberField label="Fuel price" value={displayDraft.gas} set={setField('gas')} prefix="$" suffix="/ gal" normalizeOnBlur={!canonicalCalculatorMode}/>)}
      </div>{energyBasisSelected && vehicleIsElectric && <p className="field-hint">Enter cents per kilowatt-hour. For example, 32¢/kWh is $0.32/kWh.</p>}</section>
      <section className="calc-group"><span className="eyebrow">03 / ONGOING COSTS</span><h2 className="serif">What you set aside monthly</h2><div className="input-grid"><NumberField label="Insurance" value={displayDraft.insurance} set={setField('insurance')} prefix="$" suffix="/ mo" normalizeOnBlur={!canonicalCalculatorMode}/><NumberField label="Maintenance" value={displayDraft.maintenance} set={setField('maintenance')} prefix="$" suffix="/ mo" normalizeOnBlur={!canonicalCalculatorMode}/><NumberField label="Repairs reserve" value={displayDraft.repairs} set={setField('repairs')} prefix="$" suffix="/ mo" normalizeOnBlur={!canonicalCalculatorMode}/></div></section>
      {financingReady ? <FinancingAnalysis f={financing}/> : <div className="calc-group" role="status">Add {missingFinance.join(", ")} to view loan analysis.</div>}
    </div><aside className="calc-result">
      <span className="eyebrow">{monthlyCosts.isPartial ? "PARTIAL MONTHLY ESTIMATE" : hasMonthlyEstimate ? "ESTIMATED MONTHLY OWNERSHIP" : "MONTHLY OWNERSHIP ESTIMATE"}{canonicalCalculatorMode ? "" : " · DEMO"}</span>
      <strong className="serif">{displayedMonthly}{hasMonthlyEstimate && <small>/ month</small>}</strong>
      <div className="annual-total">{hasMonthlyEstimate ? currency(monthly * 12) : "—"} <span>{hasMonthlyEstimate ? monthlyCosts.isPartial ? "partial per year" : "per year" : ""}</span></div>
      <div className="result-breakdown">{resultLines.map(([name, value]) => <div key={name}><span>{name}</span><b>{value}</b></div>)}</div>
      {hasMonthlyEstimate && monthly > 0 && <div className="result-bar" aria-label={monthlyCosts.isPartial ? "Partial estimate breakdown" : "Estimated monthly costs"}><i style={{ width: `${payment / monthly * 100}%` }}/><i style={{ width: `${fuel / monthly * 100}%` }}/><i style={{ width: `${insurance / monthly * 100}%` }}/><i style={{ width: `${(maintenance + repairs) / monthly * 100}%` }}/></div>}
      {monthlyCosts.isPartial && <small className="calc-demo-note" role="status">Partial estimate. Not included: {monthlyCosts.excludedLabels.join(", ")}.</small>}
      {canonicalCalculatorMode && monthlyCosts.isComplete && <small className="calc-demo-note">Only entered inputs and known profile values you explicitly selected are included.</small>}
      {!canonicalCalculatorMode && <small className="calc-demo-note">Demo estimate using your inputs and prototype tax rates. Not a quote or offer.</small>}
      <small className="calc-disclaimer">{canonicalCalculatorMode ? "Financing uses a standard fixed-rate amortization formula. Sales tax and dealer fees use the assumptions entered above and are not official figures. Registration fees and depreciation are not included. Verify final figures with the dealer, lender, DMV or tax authority, and other appropriate sources." : "Financing uses a standard fixed-rate amortization formula. Sales tax (prototype state estimates, not official data) and dealer fees are estimates. Registration fees and depreciation are not included. Actual taxes, registration costs, dealer charges, lender terms, insurance, maintenance and other ownership costs may differ. Verify final figures with the dealer, lender, DMV or tax authority, and other appropriate sources."}</small>
      <button className="button light full" onClick={() => window.print()}>Print this estimate <ArrowUpRight size={15}/></button>
    </aside></div>
  </div></Shell>;
}
function NumberField({ label: fieldLabel, value, set, prefix, suffix, normalizeOnBlur = true }: { label: string; value: string; set: (value: string) => void; prefix?: string; suffix?: string; normalizeOnBlur?: boolean }) {
  return <label className="field-label">{fieldLabel}<span className="number-input">{prefix && <i>{prefix}</i>}<input aria-label={fieldLabel} type="number" min="0" step="any" value={value} onFocus={e => { if (e.currentTarget.value === '0') e.currentTarget.select(); }} onChange={e => set(e.currentTarget.value)} onBlur={e => { if (!normalizeOnBlur) return; const next = normalizeCalculatorNumber(e.currentTarget.value); if (next !== e.currentTarget.value) set(next); }}/>{suffix && <i>{suffix}</i>}</span></label>;
}

// Fictional layout scenarios, used only for records flagged isDemo. They illustrate report format, not real claims.
const PREVIEW_SCENARIOS = [
  { title: 'Sample scenario: a quiet first two years', body: 'Fictional example text showing how an owner might summarize a stretch of ownership with only routine servicing.', fields: ['Reliability: no unscheduled visits', 'Maintenance cost: sample figure, routine only', 'Major repairs: none in this scenario', 'Would buy again: yes'] },
  { title: 'Sample scenario: running costs higher than planned', body: 'Fictional example text showing how an owner might compare actual running costs with what they budgeted before buying.', fields: ['Reliability: a few minor faults', 'Maintenance cost: sample figure, above budget', 'Major repairs: one sample entry, no detail', 'Would buy again: maybe'] },
  { title: 'Sample scenario: mixed feelings, steady use', body: 'Fictional example text showing how an owner might weigh everyday likes and dislikes in one summary.', fields: ['Reliability: mixed', 'Maintenance cost: sample figure, near budget', 'Major repairs: none in this scenario', 'Would buy again: yes'] },
  { title: 'Sample scenario: frequent workshop trips', body: 'Fictional example text showing how an owner might describe repeated visits and what they would do differently.', fields: ['Reliability: repeated workshop trips', 'Maintenance cost: sample figure, well above budget', 'Major repairs: two sample entries, no detail', 'Would buy again: no'] },
];

function CommunityPage() {
  const [make, setMake] = useState('');
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);
  const [configurationId, setConfigurationId] = useState('');
  const [submissionTitle, setSubmissionTitle] = useState('');
  const [submissionBody, setSubmissionBody] = useState('');
  const [attestsFirsthand, setAttestsFirsthand] = useState(false);
  const [consentsToPublication, setConsentsToPublication] = useState(false);
  const makes = useListMakes();
  const vehicles = useListVehicles({ ...(make ? { makeSlug: make } : {}), limit: 100 });
  const catalogOptions = useGetCatalogOptions();
  const reports = useListOwnerReports({});
  const submission = useSubmitOwnerExperience();
  const canonicalConfigurations = (catalogOptions.data || []).filter(option =>
    option.profileKind === "canonical" && typeof option.canonicalConfigurationId === "number" &&
    vehicles.data?.some(vehicle => vehicle.canonicalConfigurationId === option.canonicalConfigurationId &&
      vehicle.publicationStatus === "publicly_released"),
  );
  // Vehicle id is the hook for future vehicle-specific linking (e.g. /community?vehicle=<id>).
  const filtered = (reports.data || []).filter(r => !make || vehicles.data?.some(v => v.id === r.vehicleId));
  const hasReviewedExperiences = filtered.some(r => !r.isDemo);
  const submissionAvailability = catalogOptions.isLoading
    ? "Checking which canonical vehicle configurations are open for submissions."
    : catalogOptions.isError
      ? "The canonical vehicle list is unavailable right now. You can retry after opening the form."
      : canonicalConfigurations.length === 0
        ? "No canonical configurations are currently released for owner submissions. Fictional demo profiles are not eligible."
        : "Submit an account for one exact canonical configuration. Every submission stays private until reviewers check the content and vehicle applicability.";
  const submitExperience = (event: FormEvent) => {
    event.preventDefault();
    if (!configurationId || !attestsFirsthand || !consentsToPublication) return;
    submission.mutate({
      data: {
        configurationId: Number(configurationId),
        title: submissionTitle,
        body: submissionBody,
        firsthandAttestation: true,
        publicationConsent: true,
      },
    }, {
      onSuccess: () => {
        setShowSubmissionForm(false);
        setConfigurationId('');
        setSubmissionTitle('');
        setSubmissionBody('');
        setAttestsFirsthand(false);
        setConsentsToPublication(false);
      },
    });
  };
  return <Shell><div className="content-wrap page-wrap community-page"><PageIntro eyebrow="COMMUNITY" title="Owner experiences, kept honest." sub="This is where owners will describe what a car was like after the purchase: reliability, running costs, repairs and whether they would buy it again."/>
    <section className="community-cta" data-testid="community-share-cta"><div><span className="eyebrow">FIRSTHAND SUBMISSIONS</span><h2 className="serif">Share your ownership experience.</h2><p>{submissionAvailability}</p></div><button type="button" className="community-cta-button" aria-expanded={showSubmissionForm} aria-controls="owner-submission-form" onClick={() => { submission.reset(); setShowSubmissionForm(open => !open); }}>Share Your Ownership Experience <ArrowRight size={15}/><small>Reviewed before publication</small></button></section>
    {submission.data && !showSubmissionForm && <p className="submission-success" role="status">{submission.data.message}</p>}
    {showSubmissionForm && <form id="owner-submission-form" className="owner-submission-form" onSubmit={submitExperience}>
      <div><span className="eyebrow">SUBMIT FOR REVIEW</span><h2 className="serif">Start with the exact vehicle.</h2><p>Your report will not be public while it is pending. We do not ask for your name or contact information here.</p></div>
      {catalogOptions.isLoading ? <p className="submission-note" role="status">Loading canonical configurations…</p> :
        catalogOptions.isError ? <div className="submission-note" role="alert">We couldn’t load the canonical vehicle list. <button type="button" className="text-link" onClick={() => catalogOptions.refetch()}>Try again</button></div> :
        canonicalConfigurations.length === 0 ? <p className="submission-note" role="status">No canonical configurations are currently open for owner submissions. Demo profiles are not eligible.</p> :
        <>
        <label className="submission-field">Exact vehicle configuration
          <select required value={configurationId} onChange={event => setConfigurationId(event.target.value)}>
            <option value="">Choose a canonical configuration</option>
            {canonicalConfigurations.map(option => <option key={option.canonicalConfigurationId} value={option.canonicalConfigurationId}>
              {option.year} {option.make} {option.model} · {option.generation} · {option.trim}
            </option>)}
          </select>
          <small>This selection is saved as a canonical configuration ID; similar make/model names are not treated as a match.</small>
        </label>
      <label className="submission-field">Title
        <input required minLength={5} maxLength={120} value={submissionTitle} onChange={event => setSubmissionTitle(event.target.value)} placeholder="What should readers know about this experience?"/>
      </label>
      <label className="submission-field">Your firsthand experience
        <textarea required minLength={30} maxLength={4000} rows={6} value={submissionBody} onChange={event => setSubmissionBody(event.target.value)} placeholder="Describe what you experienced with this exact configuration. Avoid including personal or sensitive information."/>
        <small>{submissionBody.length}/4000 characters</small>
      </label>
      <label className="submission-consent"><input type="checkbox" required checked={attestsFirsthand} onChange={event => setAttestsFirsthand(event.target.checked)}/><span>I confirm this is my firsthand experience with the exact configuration selected.</span></label>
      <label className="submission-consent"><input type="checkbox" required checked={consentsToPublication} onChange={event => setConsentsToPublication(event.target.checked)}/><span>I consent to AutoResearch reviewing and, if approved, publishing this experience for that exact configuration. I understand pending submissions stay private.</span></label>
      </>}
      {submission.isError && <p className="submission-error" role="alert">We couldn’t submit this experience. Check the selected vehicle and try again.</p>}
      <div className="submission-actions"><button type="button" className="button secondary" onClick={() => setShowSubmissionForm(false)}>Close</button>{canonicalConfigurations.length > 0 && !catalogOptions.isLoading && !catalogOptions.isError && <button type="submit" className="button dark" disabled={submission.isPending}>{submission.isPending ? "Sending…" : "Submit for review"} <ArrowRight size={15}/></button>}</div>
    </form>}
    {!hasReviewedExperiences && <DemoNotice/>}
    <div className="community-kinds"><div><span className="eyebrow">OWNER REPORTS</span><p>{hasReviewedExperiences ? "Reviewed firsthand ownership experiences linked to exact vehicle profiles. New submissions are checked for content and vehicle applicability before publication." : "No reviewed firsthand experiences are published yet. Eligible submissions are tied to an exact canonical configuration and stay private during review."}</p></div><div><span className="eyebrow">RESEARCHED OWNER-REPORTED ISSUES</span><p>Patterns we may identify from external sources, always labeled with where they came from. Not shown here, and separate from owner reports.</p></div></div>
    <p className="fiction-note" data-testid="text-fiction-note">{hasReviewedExperiences ? "Reviewed owner experiences apply only to the exact vehicle profiles identified on each report. Records marked as fictional samples only illustrate the report format and are not evidence. Externally researched patterns are separate from firsthand experiences." : "The scenarios below are fictional and only illustrate report format. They are not evidence or claims about the vehicles named."}</p>
    <div className="community-toolbar"><div><span className="eyebrow">{hasReviewedExperiences ? "FILTER OWNER EXPERIENCES" : "FILTER SAMPLE EXPERIENCES"}</span><label className="select-inline"><span className="sr-only">Filter by manufacturer</span><select value={make} onChange={e => setMake(e.target.value)}><option value="">All manufacturers</option>{(makes.data || []).map(m => <option key={m.makeKey || `legacy:make:${m.id}`} value={m.slug}>{m.name}</option>)}</select><ChevronDown size={15}/></label></div><span className="report-count">{filtered.length} {hasReviewedExperiences ? "owner experiences and samples" : "sample experiences"}</span></div>
    {reports.isLoading ? <LoadingBlock/> : reports.isError ? <ErrorBlock retry={() => reports.refetch()}/> : filtered.length ? <div className="community-grid">{filtered.map((r, i) => {
      const sc = r.isDemo ? PREVIEW_SCENARIOS[Math.abs(r.id) % PREVIEW_SCENARIOS.length] : null;
      return <article className={`community-card community-${i % 3}`} key={`${r.isDemo ? "demo" : "canonical"}:${r.vehicleId}:${r.id}`} data-vehicle-id={r.vehicleId}>
        <span className="demo-tag sample-top">{r.isDemo ? "SAMPLE EXPERIENCE · FICTIONAL PREVIEW" : "REVIEWED OWNER EXPERIENCE · EXACT PROFILE"}</span>
        <div className="report-heading"><span className="avatar-initial">{r.displayName.slice(0, 1)}</span><div><b>{r.displayName}</b><small>{r.ownershipMonths ?? "—"} months · {r.milesDriven == null ? "—" : r.milesDriven.toLocaleString()} miles</small></div><span className="report-rating">{r.rating == null ? "—" : `${r.rating.toFixed(1)} / 5`}</span></div>
        <h2 className="serif">{sc ? sc.title : r.title}</h2><p>{sc ? sc.body : r.body}</p>
        {sc && <div className="preview-block"><span className="preview-label">FICTIONAL SAMPLE DETAILS</span><ul className="preview-fields">{sc.fields.map(t => <li key={t}>{t}</li>)}</ul></div>}
        <div className="community-meta"><Link href={`/vehicles/${encodeURIComponent(r.vehicleId)}`}>{r.vehicleLabel}</Link>{r.reportedProblem && <span><Wrench size={13}/> {r.reportedProblem}</span>}</div>
      </article>;
    })}</div> : <EmptyBlock title="No owner experiences match" text="Try another manufacturer filter."/>}
  </div></Shell>;
}

function AboutPage() {
  const covers = [['Reliability research', 'Estimated reliability and the questions behind a score.'], ['Maintenance expectations', 'What routine care may involve over the years.'], ['Ownership costs', 'Fuel, insurance, repairs and depreciation beyond the price.'], ['Specifications', 'Powertrains, trims and the numbers that differ between them.'], ['Known and reported issues', 'Problems worth asking about before you buy.'], ['Owner perspectives', 'Firsthand accounts linked to an exact vehicle configuration and reviewed before publication.'], ['Comparison tools', 'Up to four vehicles side by side.']];
  return <Shell>
    <div className="content-wrap page-wrap about-page">
      <PageIntro eyebrow="WHY AUTORESEARCH" title="Better questions make better ownership." sub="A car is a purchase. Ownership is the relationship that follows. Auto Research is designed to help shoppers look beyond the purchase price and the first day."/>
      <DemoNotice/>
      <div className="about-lead"><span className="big-number serif">01</span><div><h2 className="serif">A guide, not a verdict.</h2><p>We bring reliability research, maintenance expectations, ownership costs, specifications, known issues, owner perspectives and comparison tools into one place, so shoppers have a clearer basis for deciding what to investigate. A score or estimate cannot decide for you.</p></div></div>
      <section className="about-covers"><span className="eyebrow">WHAT YOU'LL FIND</span><h2 className="serif">Connected research.</h2><ul>{covers.map(([t, d]) => <li key={t}><b>{t}</b><span>{d}</span></li>)}</ul><p className="about-note">Vehicle profiles follow a clear hierarchy: manufacturer, model, generation, model year and trim. Each piece of research belongs to the most relevant vehicle profile.</p></section>
      <div className="about-columns">
        <article><span className="eyebrow">CANONICAL PROFILES</span><h3 className="serif">Identity is not a complete report.</h3><p>A canonical profile verifies the identity of an exact vehicle configuration. That does not verify every specification, estimate or issue. Canonical research fields carry their own status: Known, Unknown, Not yet researched or Not applicable. A missing value stays missing, not zero.</p></article>
        <article><span className="eyebrow">OPTIONAL CLAIMS</span><h3 className="serif">Read the field, not just the profile.</h3><p>A Known status applies only to that specific researched field. Where available, its provenance identifies the supporting claim, review status and source. It is not a guarantee or official guidance; check the evidence and confirm important details with the manufacturer or appropriate authority.</p></article>
        <article><span className="eyebrow">ILLUSTRATIVE RECORDS</span><h3 className="serif">Demo data stays labeled.</h3><p>Legacy demo vehicle records, estimates and fictional sample owner reports are illustrative examples, not verified automotive facts or firsthand submissions. A catalog may contain canonical profiles and demo records together, so check the status shown for each vehicle and field.</p></article>
        <article><span className="eyebrow">OWNER REPORTS AND RESEARCHED ISSUES</span><h3 className="serif">Two different evidence types.</h3><p>Owner reports are firsthand experiences submitted by AutoResearch users and stay private until reviewers check their content and exact-vehicle applicability. Researched owner-reported issues are patterns from external sources, not AutoResearch submissions, and must be labeled with their source and applicable scope.</p></article>
      </div>
      <section className="official-sources"><span className="eyebrow">FOR THE THINGS THAT MUST BE CURRENT</span><h2 className="serif">Go to the authoritative source.</h2><p>Recall and safety status can change by vehicle and VIN. Check recalls and safety information directly with NHTSA and the vehicle manufacturer; consult fueleconomy.gov for EPA fuel-economy figures.</p><div><a href="https://www.nhtsa.gov/recalls" target="_blank" rel="noreferrer"><Shield size={18}/> NHTSA recalls by VIN <ArrowUpRight size={15}/></a><a href="https://www.nhtsa.gov/ratings" target="_blank" rel="noreferrer"><BadgeCheck size={18}/> NHTSA safety ratings <ArrowUpRight size={15}/></a><a href="https://www.fueleconomy.gov/" target="_blank" rel="noreferrer"><Fuel size={18}/> EPA fuel economy <ArrowUpRight size={15}/></a></div></section>
      <div className="about-bottom"><span className="eyebrow">BE CURIOUS. VERIFY. THEN DECIDE.</span><Link href="/browse" className="button dark">Explore the vehicle index <ArrowRight size={15}/></Link></div>
    </div>
  </Shell>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function Router() {
  return <RoutedErrorBoundary><Switch>
    <Route path="/" component={HomePage}/><Route path="/browse" component={BrowsePage}/>
    <Route path="/manufacturers/:makeSlug" component={ManufacturerPage}/><Route path="/vehicles/:vehicleId" component={DetailPage}/>
    <Route path="/compare" component={ComparePage}/><Route path="/calculator" component={CalculatorPage}/>
    <Route path="/community" component={CommunityPage}/><Route path="/about" component={AboutPage}/>
    <Route component={NotFound}/>
  </Switch></RoutedErrorBoundary>;
}
function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router/></WouterRouter><Toaster/></TooltipProvider></QueryClientProvider>;
}
export default App;