import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode, FormEvent, KeyboardEvent } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Link, Route, Switch, useLocation, useParams, Router as WouterRouter } from 'wouter';
import { getGetVehicleQueryKey, useGetCatalogOptions, useGetDiscoveryStats, useGetMake, useGetVehicle, useListMakes, useListOwnerReports, useListPopularVehicles, useListTrendingVehicles, useListVehicles } from '@workspace/api-client-react';
import type { Make, VehicleDetail, VehicleSummary } from '@workspace/api-client-react';
import { ArrowDown, ArrowRight, ArrowUpRight, BadgeCheck, BookOpen, Calculator, Check, ChevronDown, CircleAlert, Fuel, Info, Menu, Search, Shield, SlidersHorizontal, Wrench, X } from 'lucide-react';
import { addComparisonId, buildBrowseLocation, buildComparisonLocation, buildVehicleListParams, calculateOwnershipEstimate, clearBrowseFilters, economyUnit, getActiveReportSection, getBrowseSuggestions, hasActiveBrowseFilters, hasInvalidBrowseSelection, normalizeCalculatorNumber, parseCalculatorNumber, optionalVehicleQueryOptions, parseBrowseFilters, parseComparisonIds, readOwnershipDraft, removeComparisonId, resolveBrowseFilters } from './shopper-tools';
import type { BrowseFilters, BrowseSuggestion, OwnershipDraft, ReportSectionId } from './shopper-tools';
import { calculateFinancingEstimate } from './financing';
import { STATE_TAX_ESTIMATES } from './state-tax-estimates';
import { FinancingAnalysis, PurchaseBreakdown } from './components/FinancingAnalysis';

const queryClient = new QueryClient();
const money = (n?: number | null) => n == null ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
const label = (v: VehicleSummary) => `${v.year} ${v.make} ${v.model}${v.trim ? ` ${v.trim}` : ''}`;

function DemoNotice({ compact = false }: { compact?: boolean }) {
  return <div className={`demo-notice ${compact ? 'compact' : ''}`}><Info size={15} /><span><b>DEMO / ESTIMATE DATA</b> — Illustrative only, not verified automotive guidance. Confirm recalls and safety information with <a href="https://www.nhtsa.gov/recalls" target="_blank" rel="noreferrer">NHTSA</a> and the vehicle manufacturer.</span></div>;
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

function Reliability({ score, size = 'normal' }: { score: number; size?: string }) {
  const safe = Math.max(0, Math.min(10, score));
  return <div className={`reliability ${size}`}><span className="score">{safe.toFixed(1)}</span><span className="score-meta"><span className="score-track"><i style={{ width: `${safe * 10}%` }}/></span><small>EST. / 10</small></span></div>;
}

function VehicleCard({ vehicle, onCompare, selected = false }: { vehicle: VehicleSummary; onCompare?: (v: VehicleSummary) => void; selected?: boolean }) {
  return <article className="vehicle-card">
    <div className={`car-art art-${(vehicle.imageKey || 'sedan').replace(/[^a-z0-9]/gi, '').toLowerCase()}`} aria-label={`Vehicle photo placeholder for ${label(vehicle)}`}><span className="art-caption">{vehicle.bodyType || 'OWNERSHIP PROFILE'}</span></div>
    <div className="vehicle-card-body"><div className="card-overline">{vehicle.year} · {vehicle.generation || 'MODEL YEAR'}</div><Link href={`/vehicles/${vehicle.id}`} className="vehicle-title serif">{vehicle.make} {vehicle.model}</Link><div className="trim-line">{vehicle.trim} <span>·</span> {vehicle.drivetrain}</div>
      <div className="vehicle-score-row"><Reliability score={vehicle.reliabilityEstimate}/><span className="estimate-caption">estimated reliability</span></div>
      <div className="vehicle-card-foot"><span><b>{money(vehicle.annualOwnershipEstimateUsd)}</b><small>annual ownership est.</small></span></div>
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
  const [searchModel, setSearchModel] = useState('');
  const [searchTrim, setSearchTrim] = useState('');
  const [, setLoc] = useLocation();
  const options = searchCatalogOptions.data || [];
  const searchYears = [...new Set(options.map(v => v.year))].sort((a, b) => b - a);
  const searchModels = [...new Set(options.filter(v => (!searchMake || v.makeSlug === searchMake) && (!searchYear || v.year === Number(searchYear))).map(v => v.model))];
  const searchTrims = [...new Set(options.filter(v => (!searchMake || v.makeSlug === searchMake) && (!searchYear || v.year === Number(searchYear)) && (!searchModel || v.model === searchModel)).map(v => v.trim))];
  const find = (e: FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (searchYear) params.set('year', searchYear);
    if (searchMake) params.set('make', searchMake);
    if (searchModel) params.set('model', searchModel);
    if (searchTrim) params.set('trim', searchTrim);
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
            <label>Year<select disabled={!searchCatalogOptions.data} value={searchYear} onChange={e => { setSearchYear(e.target.value); setSearchModel(''); setSearchTrim(''); }}><option value="">Any year</option>{searchYears.map(y => <option key={y} value={y}>{y}</option>)}</select></label>
            <label>Make<select disabled={makes.isLoading || makes.isError} value={searchMake} onChange={e => { setSearchMake(e.target.value); setSearchModel(''); setSearchTrim(''); }}><option value="">Any make</option>{(makes.data || []).map(m => <option key={m.id} value={m.slug}>{m.name}</option>)}</select></label>
            <label>Model<select disabled={!searchCatalogOptions.data} value={searchModel} onChange={e => { setSearchModel(e.target.value); setSearchTrim(''); }}><option value="">Any model</option>{searchModels.map(m => <option key={m}>{m}</option>)}</select></label>
            <label>Trim<select disabled={!searchCatalogOptions.data} value={searchTrim} onChange={e => setSearchTrim(e.target.value)}><option value="">Any trim</option>{searchTrims.map(t => <option key={t}>{t}</option>)}</select></label>
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
      <div className="hero-visual"><div className="hero-stamp">High confidence<br/>starts with good research</div><div className="hero-art" role="img" aria-label="Vehicle photography placeholder. No licensed demo vehicle photography is available."/><div className="hero-facts"><span><b>{stats.data?.vehicleCount ?? '—'}</b> vehicle trims</span><span><b>{stats.data?.makeCount ?? '—'}</b> manufacturers</span><span className="mono">ALL FIGURES ARE ESTIMATES</span></div></div>
      <div className="hero-bottom"><span>01 / START WITH THE LONG VIEW</span><a href="#explore">Scroll to explore <ArrowDown size={14}/></a></div>
    </section>
    <div className="content-wrap">
      <DemoNotice/>
      <section id="explore" className="content-section">
        <SectionHeading kicker="THE SHORTLIST" title="Popular Vehicles" link="Browse all cars" href="/browse"/>
        {popular.isLoading ? <LoadingBlock/> : popular.isError ? <ErrorBlock retry={() => popular.refetch()}/> : popularItems.length ? <div className="vehicle-grid">{popularItems.slice(0, 4).map(v => <VehicleCard key={v.id} vehicle={v}/>)}</div> : <EmptyBlock/>}
      </section>
       <section className="split-feature"><div className="feature-note"><span className="eyebrow">NOT JUST THE STICKER PRICE</span><h2 className="serif">Know the cost<br/>of keeping it.</h2><p>Fuel, maintenance, insurance, repairs and depreciation all add up. Build a monthly estimate that reflects how you actually drive.</p><Link href="/calculator" className="button dark">Estimate ownership cost <ArrowRight size={16}/></Link></div><div className="cost-visual"><div className="cost-card"><span className="eyebrow">A MORE COMPLETE PICTURE</span><strong className="serif">$ / month</strong><div className="cost-bars"><i/><i/><i/><i/><i/></div><div className="cost-labels"><span>Fuel</span><span>Service</span><span>Cover</span><span>Value</span></div><small>Illustrative ownership categories</small></div><div className="orbit orbit-a"/><div className="orbit orbit-b"/><div className="orbit-dot"/></div></section>
       <section className="reliability-explainer"><div><span className="eyebrow">RELIABILITY NEEDS CONTEXT</span><h2 className="serif">A score is a starting point,<br/>not a promise.</h2></div><p>Look at the model year, powertrain, service history and the specific problems reported—not just one number. Our demo ratings are illustrative and should guide questions, not replace a qualified inspection.</p><Link href="/browse?sort=reliability" className="text-link">Browse reliability estimates <ArrowRight size={15}/></Link></section>
      <section className="content-section">
        <SectionHeading kicker="IN THE CONVERSATION" title="Most researched this week" link="See all vehicles" href="/browse?sort=popular"/>
        {trending.isLoading ? <LoadingBlock/> : trending.isError ? <ErrorBlock retry={() => trending.refetch()}/> : trendingItems.length ? <div className="trend-list">{trendingItems.slice(0, 5).map((v, i) => <Link key={v.id} href={`/vehicles/${v.id}`} className="trend-row"><span className="trend-rank mono">0{i + 1}</span><span className="trend-name"><small>{v.year} / {v.trim}</small><b className="serif">{v.make} {v.model}</b></span><span className="trend-cost">{money(v.annualOwnershipEstimateUsd)}<small>annual est.</small></span><Reliability score={v.reliabilityEstimate} size="small"/><ArrowUpRight size={17}/></Link>)}</div> : <EmptyBlock/>}
      </section>
       <section className="makes-section"><div className="makes-intro"><span className="eyebrow">EXPLORE THE FIELD</span><h2 className="serif">Start with<br/>a name you know.</h2><p>Browse manufacturer profiles and compare the vehicles in their lineup.</p></div><div className="make-list">{makes.isLoading ? <div className="skeleton"/> : makes.isError ? <button className="button secondary" onClick={() => makes.refetch()}>Retry manufacturers</button> : (makes.data || []).map((m: Make, i) => <Link href={`/manufacturers/${m.slug}`} className="make-row" key={m.id}><span className="make-mark">{m.mark}</span><span><b>{m.name}</b><small>{m.vehicleCount} researched trims</small></span><span className="make-index mono">{String(i + 1).padStart(2, '0')}</span><ArrowUpRight size={16}/></Link>)}</div></section>
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
  const updateFilters = (changes: Partial<BrowseFilters>) => {
    const candidate = { ...browse, ...changes };
    const next = catalogReady ? resolveBrowseFilters(candidate, catalog) : candidate;
    commit(next);
  };
  const selectSuggestion = (suggestion: BrowseSuggestion) => {
    if (suggestion.kind === "vehicle" && suggestion.profileId) {
      setLoc(`/vehicles/${suggestion.profileId}`);
      return;
    }
    if (suggestion.kind === "manufacturer") {
      updateFilters({ q: "", make: suggestion.makeSlug, model: "", modelId: "", generationId: "", year: "", trim: "", trimId: "" });
      return;
    }
    updateFilters({ q: "", make: suggestion.makeSlug, model: "", modelId: String(suggestion.modelId), generationId: "", year: "", trim: "", trimId: "" });
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
  const modelOptions = [...new Map(scoped.map((option) => [option.modelId, { id: option.modelId, name: option.model }])).values()];
  const selectedModelOptions = scoped.filter((option) => !browse.modelId || String(option.modelId) === browse.modelId);
  const generationOptions = [...new Map(selectedModelOptions.map((option) => [option.generationId, { id: option.generationId, name: option.generation }])).values()];
  const selectedGenerationOptions = selectedModelOptions.filter((option) => !browse.generationId || String(option.generationId) === browse.generationId);
  const yearOptions = [...new Set(selectedGenerationOptions.map((option) => option.year))].sort((a, b) => a - b);
  const selectedYearOptions = selectedGenerationOptions.filter((option) => !browse.year || String(option.year) === browse.year);
  const trimOptions = [...new Map(selectedYearOptions.map((option) => [option.trimId, { id: option.trimId, name: option.trim }])).values()];
  const filters = useMemo(() => buildVehicleListParams(browse), [browse]);
  const vehicles = useListVehicles(filters);
  const [selected, setSelected] = useState<string[]>([]);
  const toggle = (v: VehicleSummary) => setSelected(s => s.includes(v.id) ? s.filter(id => id !== v.id) : s.length < 4 ? [...s, v.id] : s);
  return <Shell><div className="content-wrap page-wrap"><PageIntro eyebrow="THE VEHICLE INDEX" title="Find the right long view." sub="Search trims, narrow the field, and see what ownership may look like beyond the purchase price." action={<span className="small-stamp"><BookOpen size={16}/> {vehicles.data?.length ?? '—'} profiles</span>}/><DemoNotice/>
    <div className="browse-layout"><aside className="filter-panel"><div className="filter-title"><SlidersHorizontal size={16}/> Refine research</div>
      <div className="browse-search-wrap" ref={searchBoxRef}><label className="field-label" htmlFor="browse-vehicle-search">Search</label><input id="browse-vehicle-search" data-testid="input-search-vehicles" className="browse-search-input" role="combobox" aria-autocomplete="list" aria-expanded={suggestionsOpen} aria-controls={suggestionsOpen && !catalogOptions.isLoading && !catalogOptions.isError && suggestions.length ? "browse-suggestions" : undefined} aria-activedescendant={activeSuggestion >= 0 ? `browse-suggestion-${activeSuggestion}` : undefined} value={draft} onFocus={() => setSuggestionsOpen(true)} onChange={event => { setDraft(event.target.value); setSuggestionsOpen(true); setActiveSuggestion(-1); }} onCompositionStart={() => setComposing(true)} onCompositionEnd={() => setComposing(false)} onKeyDown={handleSearchKeyDown} placeholder="Make, model, trim"/>
        {suggestionsOpen && <div className="browse-suggestions" aria-live="polite">
          {catalogOptions.isLoading ? <div className="browse-suggestion-status" role="status">Loading catalog suggestions…</div> :
            catalogOptions.isError ? <div className="browse-suggestion-status" role="status">Catalog suggestions are unavailable. You can still search by text and use the existing filters. <button type="button" onMouseDown={event => event.preventDefault()} onClick={() => catalogOptions.refetch()}>Retry</button></div> :
              suggestions.length ? <div id="browse-suggestions" role="listbox" aria-label="Vehicle search suggestions">{suggestions.map((suggestion, index) => <button type="button" role="option" aria-selected={activeSuggestion === index} id={`browse-suggestion-${index}`} className={activeSuggestion === index ? "active" : ""} key={`${suggestion.kind}-${suggestion.profileId || suggestion.modelId || suggestion.makeSlug}`} onMouseDown={event => event.preventDefault()} onClick={() => selectSuggestion(suggestion)}><span>{suggestion.label}</span><small>{suggestion.kind === "manufacturer" ? "Browse manufacturer" : suggestion.kind === "model" ? "Browse model" : "Open vehicle report"}</small></button>)}</div> :
                draft.trim() ? <div className="browse-suggestion-status" role="status">No catalog suggestions. Press Enter to search this text.</div> :
                  <div className="browse-suggestion-status" role="status">Start typing to find a manufacturer, model, or vehicle.</div>}
        </div>}
      </div>
      {catalogOptions.isError && <div className="catalog-options-error" role="status">Catalog filters could not be loaded. Your URL filters are preserved; retry to load complete options. <button type="button" onClick={() => catalogOptions.refetch()}>Retry catalog</button></div>}
      {invalidHierarchyFilter && <div className="catalog-filter-mismatch" role="status">A saved vehicle filter does not match the available catalog. It remains active so results are not broadened; clear or change filters to continue.</div>}
      <label className="field-label">Manufacturer<select disabled={!catalogReady} value={browse.make} onChange={event => updateFilters({ make: event.target.value, model: "", modelId: "", generationId: "", year: "", trim: "", trimId: "" })}><option value="">All manufacturers</option>{makeOptions.map(makeOption => <option value={makeOption.slug} key={makeOption.slug}>{makeOption.name}</option>)}</select></label>
      <label className="field-label">Model<select disabled={!catalogReady || !browse.make} value={browse.modelId} onChange={event => updateFilters({ model: "", modelId: event.target.value, generationId: "", year: "", trim: "", trimId: "" })}><option value="">All models</option>{modelOptions.map(option => <option value={option.id} key={option.id}>{option.name}</option>)}</select></label>
      <label className="field-label">Generation<select disabled={!catalogReady || !browse.modelId} value={browse.generationId} onChange={event => updateFilters({ generationId: event.target.value, year: "", trim: "", trimId: "" })}><option value="">All generations</option>{generationOptions.map(option => <option value={option.id} key={option.id}>{option.name}</option>)}</select></label>
      <label className="field-label">Model year<select disabled={!catalogReady} value={browse.year} onChange={event => updateFilters({ year: event.target.value, trim: "", trimId: "" })}><option value="">All years</option>{yearOptions.map(option => <option value={option} key={option}>{option}</option>)}</select></label>
      <label className="field-label">Trim<select disabled={!catalogReady} value={browse.trimId} onChange={event => updateFilters({ trim: "", trimId: event.target.value })}><option value="">All trims</option>{trimOptions.map(option => <option value={option.id} key={option.id}>{option.name}</option>)}</select></label>
      <label className="field-label">Order by<select value={browse.sort} onChange={event => updateFilters({ sort: event.target.value as BrowseFilters["sort"] })}><option value="popular">Most popular</option><option value="reliability">Estimated reliability</option><option value="ownership-cost">Annual ownership cost</option></select></label>
      {(hasActiveBrowseFilters(browse) || draft.trim()) && <button className="clear-filters" onClick={() => { commit(clearBrowseFilters()); }} aria-label="Clear all search filters">Clear all filters <X size={14}/></button>}<p className="filter-foot">Results are illustrative estimates, not independently verified guidance.</p></aside>
    <div className="results-area"><div className="results-top"><span>{vehicles.data?.length ?? 0} profiles shown</span><span className="mono">SORT: {browse.sort.replace('-', ' ').toUpperCase()}</span></div>
      {vehicles.isLoading ? <LoadingBlock/> : vehicles.isError ? <ErrorBlock retry={() => vehicles.refetch()}/> : !vehicles.data?.length ? <EmptyBlock/> : <div className="vehicle-grid browse-grid">{vehicles.data.map(v => <VehicleCard key={v.id} vehicle={v} onCompare={toggle} selected={selected.includes(v.id)}/>)}</div>}
    </div>
    </div>
    {selected.length > 0 && <div className="compare-dock"><span><b>{selected.length}</b> selected for comparison <small>Choose up to four vehicles</small></span><div>{selected.map(id => <button aria-label="Remove from comparison" key={id} onClick={() => setSelected(s => s.filter(x => x !== id))}><X size={13}/></button>)}</div><button className="button dark" onClick={() => setLoc(`/compare?ids=${selected.join(',')}`)}>Compare vehicles <ArrowRight size={15}/></button></div>}
  </div></Shell>;
}

function ManufacturerPage() {
  const { makeSlug = '' } = useParams();
  const profile = useGetMake(makeSlug);
  return <Shell><div className="content-wrap page-wrap">{profile.isLoading ? <LoadingBlock/> : profile.isError || !profile.data ? <ErrorBlock retry={() => profile.refetch()}/> : <><div className="manufacturer-hero"><span className="make-mark big">{profile.data.make.mark}</span><div><span className="eyebrow">MANUFACTURER PROFILE · DEMO ESTIMATES</span><h1 className="serif">{profile.data.make.name}</h1><p>{profile.data.description}</p></div><span className="manufacturer-count mono">{profile.data.make.vehicleCount} VEHICLE TRIMS</span></div><DemoNotice/><section className="content-section"><SectionHeading kicker="LINEUP SNAPSHOT" title={`Explore ${profile.data.make.name}`} link="Full catalog" href={`/browse?make=${makeSlug}`}/>{profile.data.vehicles.length ? <div className="vehicle-grid">{profile.data.vehicles.map(v => <VehicleCard key={v.id} vehicle={v}/>)}</div> : <EmptyBlock title="No featured trims yet" text="Browse the catalog to see all available vehicle profiles."/ >}</section></>}</div></Shell>;
}

function DetailPage() {
  const { vehicleId = '' } = useParams();
  const vehicle = useGetVehicle(vehicleId);
  const reports = useListOwnerReports({ vehicleId });
  const [activeSection, setActiveSection] = useState("overview");
  const detailNavRef = useRef<HTMLElement>(null);
  const [loc, setLoc] = useLocation();
  useEffect(() => {
    if (!vehicle.data) return;
    const sectionIds: ReportSectionId[] = ["overview", "reliability", "costs", "reports"];
    const sections = sectionIds.map((id) => document.getElementById(id)).filter((section): section is HTMLElement => Boolean(section));
    const updateActiveSection = () => {
      const headerHeight = document.querySelector<HTMLElement>(".site-header")?.getBoundingClientRect().height ?? 72;
      const navHeight = detailNavRef.current?.getBoundingClientRect().height ?? 44;
      const activationLine = headerHeight + navHeight + 8;
      const atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 8;
      setActiveSection(getActiveReportSection(
        sections.map((section) => ({ id: section.id as ReportSectionId, top: section.getBoundingClientRect().top })),
        activationLine,
        atBottom,
      ));
    };
    let animationFrame = 0;
    const scheduleUpdate = () => {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(updateActiveSection);
    };
    const observer = new IntersectionObserver(scheduleUpdate, { threshold: [0, 0.01, 0.5, 1] });
    sections.forEach((section) => observer.observe(section));
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    scheduleUpdate();
    const hashSection = window.location.hash.slice(1);
    if (sectionIds.some((sectionId) => sectionId === hashSection) && !(hashSection === "reports" && reports.isLoading)) {
      requestAnimationFrame(() => document.getElementById(hashSection)?.scrollIntoView({ block: "start", behavior: "instant" }));
    }
    return () => {
      cancelAnimationFrame(animationFrame);
      observer.disconnect();
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [vehicle.data, reports.isLoading]);
  useEffect(() => {
    detailNavRef.current?.querySelector<HTMLElement>('[aria-current="location"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeSection]);
  if (vehicle.isLoading) return <Shell><div className="content-wrap page-wrap"><LoadingBlock/></div></Shell>;
  if (vehicle.isError || !vehicle.data) return <Shell><div className="content-wrap page-wrap"><ErrorBlock retry={() => vehicle.refetch()}/></div></Shell>;
  const v = vehicle.data;
  const tabs = [
    ["overview", "Overview"],
    ["reliability", "Reliability"],
    ["costs", "Ownership costs"],
    ["reports", "Owner reports"],
  ];
  return <Shell><div className="content-wrap page-wrap">
    <div className="crumbs"><Link href="/">Home</Link><span>/</span><Link href={`/manufacturers/${v.makeSlug}`}>{v.make}</Link><span>/</span><span>{v.model}</span></div>
    <div className="detail-hero"><div><span className="eyebrow">{v.year} · {v.generation} · {v.bodyType}</span><h1 className="serif">{v.make} {v.model}<br/><em>{v.trim}</em></h1><p>{v.overview}</p><div className="detail-actions"><button className="button dark" onClick={() => setLoc(`/compare?ids=${v.id}`)}>Compare this trim <ArrowRight size={15}/></button><button className="button secondary" onClick={() => setLoc(`/calculator?vehicle=${v.id}`)}><Calculator size={15}/> Estimate my costs</button></div></div><div className="detail-score"><span className="eyebrow">RELIABILITY ESTIMATE</span><Reliability score={v.reliability.score} size="large"/><b>{v.reliability.label}</b><small>{v.reliability.note}</small><span className="demo-tag">DEMO / ESTIMATE</span></div></div>
    <DemoNotice/>
    <div className="spec-strip">{[[v.mpgCombined == null ? "—" : `${v.mpgCombined} ${economyUnit(v.fuelType)}`, 'COMBINED EST.'], [v.drivetrain, 'DRIVETRAIN'], [v.fuelType, 'FUEL'], [`${v.horsepower} hp`, 'POWER'], [money(v.priceUsd), 'STARTING EST.']].map(([val, caption]) => <div key={caption}><b>{val}</b><small>{caption}</small></div>)}</div>
    <div className="detail-body"><nav className="detail-tabs" aria-label="Vehicle report sections" ref={detailNavRef}>{tabs.map(([id, title]) => <a href={`#${id}`} className={activeSection === id ? "active" : ""} aria-current={activeSection === id ? "location" : undefined} key={id}>{title}</a>)}</nav>
    <div className="detail-columns">
      <div className="detail-main">
         <section id="overview" className="detail-section"><span className="eyebrow">01 / POWERTRAIN & TRIM</span><h2 className="serif">What this vehicle is.</h2><p className="body-copy">This profile represents the {v.year} {v.make} {v.model} {v.trim} in the {v.generation}. Specifications and availability vary by market and configuration; confirm against the original window sticker and manufacturer documentation.</p><div className="powertrain-grid"><div><span className="eyebrow">FEATURED ENGINE</span><h3>{v.engineName}</h3>{v.engines.map((e, index) => <p className="option-line" key={`${e.name}-${index}`}><b>{e.name}</b><span>{e.horsepower} hp · {e.fuelType}</span><small>{e.availability}</small></p>)}</div><div><span className="eyebrow">FEATURED TRANSMISSION</span><h3>{v.transmissionName}</h3>{v.transmissions.map(t => <p className="option-line" key={t.name}><b>{t.name}</b><span>{t.gears}</span><small>{t.availability}</small></p>)}</div></div><div className="trim-note"><span className="eyebrow">SIBLING TRIMS</span><div>{v.siblingTrims.map(trim => <span className="pill" key={trim}>{trim}</span>)}</div></div></section>
        <section id="reliability" className="detail-section"><span className="eyebrow">02 / PATTERNS, NOT PROMISES</span><h2 className="serif">Reliability, with context.</h2><div className="reliability-panel"><Reliability score={v.reliability.score} size="large"/><div><h3>{v.reliability.label}</h3><p>{v.reliability.note}</p><small>Illustrative score out of 10; not a prediction or verified reliability rating.</small></div></div><h3 className="subhead">Reported problem areas</h3>{v.commonProblems.length ? v.commonProblems.map((p) => <div className="problem-row" key={p.title}><span className={`severity severity-${p.severity.toLowerCase()}`}>{p.severity}</span><div><h4>{p.title}</h4><p>{p.description}</p><small className={`problem-applicability ${p.applicability === "unknown" ? "unknown" : ""}`}>{p.applicability === "applies" ? "Listed for this selected engine" : "Engine applicability unknown — confirm the exact configuration"}</small><small>Typical range: {p.typicalMileageStart.toLocaleString()}–{p.typicalMileageEnd.toLocaleString()} miles</small></div><b>{money(p.repairCostLowUsd)}–{money(p.repairCostHighUsd)}<small>repair estimate</small></b></div>) : <EmptyBlock title="No problem patterns listed" text="This demo profile has no illustrative problem records."/>}</section>
        <section id="costs" className="detail-section"><span className="eyebrow">03 / THE COST OF KEEPING IT</span><h2 className="serif">Ownership costs, itemized.</h2><div className="cost-summary"><div><span>ANNUAL OWNERSHIP EST.</span><b>{money(v.annualOwnershipEstimateUsd)}</b></div><div><span>MAINTENANCE / YEAR</span><b>{money(v.annualMaintenanceEstimateUsd)}</b></div><div><span>REPAIRS / YEAR</span><b>{money(v.annualRepairEstimateUsd)}</b></div><div><span>FUEL / YEAR</span><b>{money(v.annualFuelEstimateUsd)}</b></div><div><span>INSURANCE / YEAR</span><b>{money(v.insuranceEstimateUsd)}</b></div></div><h3 className="subhead">Routine maintenance estimates</h3>{v.maintenance.map(m => <div className="maintenance-row" key={m.item}><Wrench size={16}/><b>{m.item}</b><span>Every {m.intervalMiles.toLocaleString()} miles</span><strong>{money(m.estimatedCostUsd)}</strong></div>)}<div className="depreciation-panel"><div><span className="eyebrow">FIVE-YEAR VALUE CHANGE</span><b>{v.fiveYearDepreciationPercent}%</b><small>illustrative depreciation estimate</small></div><div><span className="eyebrow">EXPECTED LIFESPAN</span><b>{v.expectedLifespanMiles.toLocaleString()} <small>miles</small></b><small>not a guarantee</small></div></div></section>
        <section className="detail-section"><span className="eyebrow">04 / BEFORE YOU BUY</span><h2 className="serif">A practical inspection list.</h2><p className="body-copy">A pre-purchase inspection by an independent mechanic is worth the time. Use this as a starting point, not a substitute.</p><div className="checklist">{v.inspectionChecklist.map(item => <label key={item}><input type="checkbox"/><span>{item}</span></label>)}</div></section>
        <section id="reports" className="detail-section"><span className="eyebrow">05 / OWNER EXPERIENCES</span><h2 className="serif">Life with this vehicle.</h2><p className="body-copy">Owner reports are sample stories for demonstration. They do not establish population-wide reliability.</p>{reports.isLoading ? <LoadingBlock/> : reports.isError ? <ErrorBlock retry={() => reports.refetch()}/> : reports.data?.length ? reports.data.map(r => <article className="report-card" key={r.id}><div className="report-heading"><span className="avatar-initial">{r.displayName.slice(0, 1)}</span><div><b>{r.displayName}</b><small>{r.ownershipMonths} months · {r.milesDriven.toLocaleString()} miles</small></div><span className="report-rating">{r.rating.toFixed(1)} / 5</span></div><h3>{r.title}</h3><p>{r.body}</p>{r.reportedProblem && <div className="reported-problem"><Wrench size={14}/> Reported issue: {r.reportedProblem}</div>}<span className="demo-tag">SAMPLE OWNER REPORT</span></article>) : <EmptyBlock title="No owner reports yet" text="There are no sample experiences associated with this trim."/ >}</section>
      </div>
      <aside className="detail-aside"><div className="aside-card"><span className="eyebrow"><Shield size={14}/> SAFETY & RECALLS</span><h3>Verify directly.</h3><p>Safety ratings and open recalls change. Always check this exact VIN with official sources before buying.</p><div className="status-line"><span>Demo recall status</span><b>{v.recallStatus}</b></div><div className="status-line"><span>Demo safety status</span><b>{v.safetyStatus}</b></div><a className="official-link" href="https://www.nhtsa.gov/recalls" target="_blank" rel="noreferrer">Check recalls at NHTSA <ArrowUpRight size={14}/></a><a className="official-link" href="https://www.nhtsa.gov/ratings" target="_blank" rel="noreferrer">NHTSA safety ratings <ArrowUpRight size={14}/></a></div><div className="aside-card cost-callout"><Calculator size={19}/><h3>Make it personal.</h3><p>Adjust the assumptions to estimate a monthly cost that fits your driving.</p><Link href={`/calculator?vehicle=${v.id}`} className="text-link">Open calculator <ArrowRight size={15}/></Link></div><div className="aside-note"><Info size={15}/><span>All figures on this page are DEMO / ESTIMATE values. Confirm specifications, maintenance schedules, and safety details with the manufacturer and official sources.</span></div></aside>
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
  return <Shell><div className="content-wrap page-wrap"><PageIntro eyebrow="SIDE BY SIDE" title="Compare what ownership feels like." sub="Line up up to four vehicles. Estimates are useful for framing questions—not declaring a winner."/><DemoNotice/><div className="compare-picker"><div className="picker-search"><Search size={16}/><input aria-label="Add a vehicle by make or model" aria-describedby="comparison-selection-status" placeholder="Add a vehicle by make or model" value={search} disabled={atLimit} onChange={e => setSearch(e.target.value)}/></div>{showSuggestions && <div className="picker-results">{catalog.isLoading ? <span>Loading vehicles…</span> : catalog.isError ? <span>Vehicle choices couldn't load. Please refresh to try again.</span> : matches.length ? matches.map(v => <button key={v.id} onClick={() => add(v.id)}>{label(v)} <span>{money(v.annualOwnershipEstimateUsd)} / yr est.</span><ArrowRight size={14}/></button>) : <span>No matching vehicles. Try another make or model.</span>}</div>}<span id="comparison-selection-status" className={`picker-count${atLimit ? ' at-limit' : ''}`} role="status">{ids.length} of 4 vehicles selected{atLimit && <small>Remove a vehicle to add another.</small>}</span></div>
    {ids.length === 0 ? <EmptyBlock title="Start your comparison" text="Search above or browse the catalog to add vehicles. Your selection stays in this URL so it is easy to revisit."/> : <div className="compare-table-wrap"><table className="compare-table"><thead><tr><th>Research point</th>{selected.map(id => <CompareColumn key={id} id={id} onRemove={remove}/>)}</tr></thead><tbody>
       <CompareRow label="Vehicle" render={d => `${d.year} ${d.make} ${d.model} ${d.trim}`}/><CompareRow label="Generation" render={d => d.generation}/><CompareRow label="Estimated reliability" render={d => `${d.reliability.score.toFixed(1)} / 10 · ${d.reliability.label}`}/><CompareRow label="Annual ownership estimate" render={d => money(d.annualOwnershipEstimateUsd)}/><CompareRow label="Maintenance / year" render={d => money(d.annualMaintenanceEstimateUsd)}/><CompareRow label="Repairs / year" render={d => money(d.annualRepairEstimateUsd)}/><CompareRow label="Fuel / year" render={d => money(d.annualFuelEstimateUsd)}/><CompareRow label="Insurance / year" render={d => money(d.insuranceEstimateUsd)}/><CompareRow label="Combined fuel economy" render={d => d.mpgCombined ? `${d.mpgCombined} ${economyUnit(d.fuelType)}` : 'Not listed'}/><CompareRow label="Powertrain" render={d => `${d.engineName} · ${d.transmissionName}`}/><CompareRow label="Five-year depreciation" render={d => `${d.fiveYearDepreciationPercent}% est.`}/><CompareRow label="Expected lifespan" render={d => `${d.expectedLifespanMiles.toLocaleString()} miles est.`}/><CompareRow label="Open recalls / safety" render={d => `Recall: ${d.recallStatus} · Safety: ${d.safetyStatus}`}/>
    </tbody></table></div>}
    <p className="compare-foot"><Info size={15}/>Compare like-for-like years and trims where possible. Local market, condition, driving habits and repair history can outweigh broad estimates.</p>
  </div></Shell>;
}

function CompareColumn({ id, onRemove }: { id: string; onRemove: (id: string) => void }) {
  const v = useGetVehicle(id);
  return <th>{v.isLoading ? <span className="skeleton compact-skeleton"/> : v.isError || !v.data ? <span>Profile unavailable</span> : <div className="compare-vehicle"><Link href={`/vehicles/${id}`} className="serif">{v.data.make} {v.data.model}</Link><small>{v.data.year} · {v.data.trim}</small><button onClick={() => onRemove(id)} aria-label="Remove vehicle"><X size={14}/> Remove</button></div>}</th>;
}
function CompareRow({ label: rowLabel, render }: { label: string; render: (d: VehicleDetail) => string }) {
  const ids = new URLSearchParams(window.location.search).get('ids')?.split(',').filter(Boolean) || [];
  return <tr><th>{rowLabel}</th>{ids.map(id => <CompareCell key={id} id={id} render={render}/>)}</tr>;
}
function CompareCell({ id, render }: { id: string; render: (d: VehicleDetail) => string }) {
  const { data } = useGetVehicle(id);
  return <td>{data ? render(data) : <span className="muted">—</span>}</td>;
}

function CalculatorPage() {
  const params = new URLSearchParams(window.location.search);
  const vehicleId = params.get('vehicle') || '';
  const vehicle = useGetVehicle(vehicleId, { query: optionalVehicleQueryOptions(vehicleId, getGetVehicleQueryKey(vehicleId)) });
  const [draft, setDraft] = useState<OwnershipDraft>({
    price: '32000', down: '5000', apr: '6.4', miles: '12000', mpg: '28',
    gas: '3.65', electricity: '0.16', insurance: '145', maintenance: '110', repairs: '55',
  });
  const [term, setTerm] = useState(60);
  const [stateCode, setStateCode] = useState('');
  const [taxRate, setTaxRate] = useState('0');
  const [dealerFees, setDealerFees] = useState('0');
  const [taxMode, setTaxMode] = useState<'financed' | 'upfront'>('financed');
  const numbers = readOwnershipDraft(draft);
  const { insurance, maintenance, repairs } = numbers;
  const vehicleIsElectric = Boolean(vehicleId) && economyUnit(vehicle.data?.fuelType || "") === "MPGe";
  const financing = calculateFinancingEstimate({ price: numbers.price, down: numbers.down, apr: numbers.apr, term, salesTaxRate: parseCalculatorNumber(taxRate), dealerFees: parseCalculatorNumber(dealerFees), taxesAndFeesPayment: taxMode });
  const { fuel } = calculateOwnershipEstimate({ ...numbers, price: financing.amountFinanced, down: 0, term, vehicleIsElectric });
  const payment = financing.monthlyLoanPayment;
  const monthly = payment + fuel + insurance + maintenance + repairs;
  const chooseState = (code: string) => { setStateCode(code); setTaxRate(String(STATE_TAX_ESTIMATES.find(x => x.code === code)?.rate ?? 0)); };
  const currency = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
  const setField = (field: keyof OwnershipDraft) => (value: string) => setDraft(current => ({ ...current, [field]: value }));
  return <Shell><div className="content-wrap page-wrap"><PageIntro eyebrow="OWNERSHIP ESTIMATOR" title="Put your own numbers in." sub="A transparent estimate for monthly and yearly costs. Change any assumption to see the whole picture move."/><DemoNotice/>
    {vehicleId && vehicle.data && <div className="prefill-banner"><Check size={15}/> Starting with estimates for <b>{vehicle.data.year} {vehicle.data.make} {vehicle.data.model} {vehicle.data.trim}</b><button onClick={() => { const profile = vehicle.data!; setDraft(current => ({ ...current, price: String(profile.priceUsd), insurance: String(profile.insuranceEstimateUsd / 12), maintenance: String(profile.annualMaintenanceEstimateUsd / 12), mpg: String(profile.mpgCombined || 28) })); }}>Use vehicle profile estimates</button></div>}
    <div className="calculator-layout"><div className="calculator-form">
      <section className="calc-group"><span className="eyebrow">01 / FINANCING</span><h2 className="serif">Purchase assumptions</h2><div className="input-grid"><NumberField label="Vehicle price" value={draft.price} set={setField('price')} prefix="$"/><NumberField label="Down payment" value={draft.down} set={setField('down')} prefix="$"/><NumberField label="APR" value={draft.apr} set={setField('apr')} suffix="%"/><label className="field-label">Loan term<select value={term} onChange={e => setTerm(Number(e.target.value))}><option value="36">36 months</option><option value="48">48 months</option><option value="60">60 months</option><option value="72">72 months</option><option value="84">84 months</option></select></label><label className="field-label">State (for sales tax estimate)<select aria-label="State" data-testid="select-state" value={stateCode} onChange={e => chooseState(e.target.value)}><option value="">Select a state</option>{STATE_TAX_ESTIMATES.map(x => <option key={x.code} value={x.code}>{x.name}</option>)}</select></label><NumberField label="Estimated sales tax rate (editable)" value={taxRate} set={setTaxRate} suffix="%"/><NumberField label="Estimated dealer fees" value={dealerFees} set={setDealerFees} prefix="$"/></div>
        <p className="field-hint">Prototype state-level estimates, not official. Local taxes, trade-ins, exemptions and registration location change the real rate. Dealer fees vary by dealer.</p>
        <fieldset className="segmented" data-testid="group-taxes-fees"><legend>Taxes &amp; fees payment</legend><button type="button" className={taxMode === 'financed' ? 'on' : ''} aria-pressed={taxMode === 'financed'} onClick={() => setTaxMode('financed')}>Include taxes &amp; fees in loan</button><button type="button" className={taxMode === 'upfront' ? 'on' : ''} aria-pressed={taxMode === 'upfront'} onClick={() => setTaxMode('upfront')}>Pay taxes &amp; fees upfront</button></fieldset>
        <PurchaseBreakdown f={financing}/></section>
      <section className="calc-group"><span className="eyebrow">02 / YOUR DRIVING</span><h2 className="serif">Fuel assumptions</h2><div className="input-grid"><NumberField label="Miles driven per year" value={draft.miles} set={setField('miles')} suffix="mi"/><NumberField label="Combined fuel economy" value={draft.mpg} set={setField('mpg')} suffix={vehicleIsElectric ? 'MPGe' : 'mpg'}/>{vehicleIsElectric ? <NumberField label="Electricity price" value={draft.electricity} set={setField('electricity')} prefix="$" suffix="/ kWh"/> : <NumberField label="Fuel price" value={draft.gas} set={setField('gas')} prefix="$" suffix="/ gal"/>}</div></section>
      <section className="calc-group"><span className="eyebrow">03 / ONGOING COSTS</span><h2 className="serif">What you set aside monthly</h2><div className="input-grid"><NumberField label="Insurance" value={draft.insurance} set={setField('insurance')} prefix="$" suffix="/ mo"/><NumberField label="Maintenance" value={draft.maintenance} set={setField('maintenance')} prefix="$" suffix="/ mo"/><NumberField label="Repairs reserve" value={draft.repairs} set={setField('repairs')} prefix="$" suffix="/ mo"/></div></section>
      <FinancingAnalysis f={financing}/>
    </div><aside className="calc-result"><span className="eyebrow">ESTIMATED MONTHLY OWNERSHIP · DEMO</span><strong className="serif">{currency(monthly)}<small>/ month</small></strong><div className="annual-total">{currency(monthly * 12)} <span>per year</span></div><div className="result-breakdown">{[['Loan payment', payment], ['Fuel', fuel], ['Insurance', insurance], ['Maintenance', maintenance], ['Repair reserve', repairs]].map(([name, value]) => <div key={name as string}><span>{name}</span><b>{currency(value as number)}</b></div>)}</div><div className="result-bar" aria-label="Estimated monthly costs"><i style={{ width: `${monthly ? payment / monthly * 100 : 0}%` }}/><i style={{ width: `${monthly ? fuel / monthly * 100 : 0}%` }}/><i style={{ width: `${monthly ? insurance / monthly * 100 : 0}%` }}/><i style={{ width: `${monthly ? (maintenance + repairs) / monthly * 100 : 0}%` }}/></div><small className="calc-demo-note">Demo estimate using your inputs and prototype tax rates. Not a quote or offer.</small><small className="calc-disclaimer">Financing uses a standard fixed-rate amortization formula. Sales tax (prototype state estimates, not official data) and dealer fees are estimates. Registration fees and depreciation are not included. Actual taxes, registration costs, dealer charges, lender terms, insurance, maintenance and other ownership costs may differ. Verify final figures with the dealer, lender, DMV or tax authority, and other appropriate sources.</small><button className="button light full" onClick={() => window.print()}>Print this estimate <ArrowUpRight size={15}/></button></aside></div>
  </div></Shell>;
}
function NumberField({ label: fieldLabel, value, set, prefix, suffix }: { label: string; value: string; set: (value: string) => void; prefix?: string; suffix?: string }) {
  return <label className="field-label">{fieldLabel}<span className="number-input">{prefix && <i>{prefix}</i>}<input aria-label={fieldLabel} type="number" min="0" step="any" value={value} onFocus={e => { if (e.currentTarget.value === '0') e.currentTarget.select(); }} onChange={e => set(e.currentTarget.value)} onBlur={e => set(normalizeCalculatorNumber(e.currentTarget.value))}/>{suffix && <i>{suffix}</i>}</span></label>;
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
  const makes = useListMakes();
  const vehicles = useListVehicles({ ...(make ? { makeSlug: make } : {}), limit: 100 });
  const reports = useListOwnerReports({});
  // Vehicle id is the hook for future vehicle-specific linking (e.g. /community?vehicle=<id>).
  const filtered = (reports.data || []).filter(r => !make || vehicles.data?.some(v => v.id === r.vehicleId));
  return <Shell><div className="content-wrap page-wrap community-page"><PageIntro eyebrow="COMMUNITY" title="Owner experiences, kept honest." sub="This is where owners will describe what a car was like after the purchase: reliability, running costs, repairs and whether they would buy it again."/>
    <section className="community-cta" data-testid="community-share-cta"><div><span className="eyebrow">COMING SOON</span><h2 className="serif">Share your ownership experience.</h2><p>Owner submissions are not open yet. Nothing can be submitted today; the sample experiences below show a layout reports could use.</p></div><span className="community-cta-button" role="note" aria-disabled="true">Share Your Ownership Experience <ArrowRight size={15}/><small>Preview only</small></span></section>
    <DemoNotice/>
    <div className="community-kinds"><div><span className="eyebrow">OWNER REPORTS</span><p>Experiences written by AutoResearch users about the car they own. Coming soon.</p></div><div><span className="eyebrow">RESEARCHED OWNER-REPORTED ISSUES</span><p>Patterns we may identify from external sources, always labeled with where they came from. Not shown here, and separate from owner reports.</p></div></div>
    <p className="fiction-note" data-testid="text-fiction-note">The scenarios below are fictional and only illustrate report format. They are not evidence or claims about the vehicles named.</p>
    <div className="community-toolbar"><div><span className="eyebrow">FILTER SAMPLE EXPERIENCES</span><label className="select-inline"><span className="sr-only">Filter by manufacturer</span><select value={make} onChange={e => setMake(e.target.value)}><option value="">All manufacturers</option>{(makes.data || []).map(m => <option key={m.id} value={m.slug}>{m.name}</option>)}</select><ChevronDown size={15}/></label></div><span className="report-count">{filtered.length} sample experiences</span></div>
    {reports.isLoading ? <LoadingBlock/> : reports.isError ? <ErrorBlock retry={() => reports.refetch()}/> : filtered.length ? <div className="community-grid">{filtered.map((r, i) => { const sc = r.isDemo ? PREVIEW_SCENARIOS[Math.abs(r.id) % PREVIEW_SCENARIOS.length] : null; return <article className={`community-card community-${i % 3}`} key={r.id} data-vehicle-id={r.vehicleId}>{r.isDemo && <span className="demo-tag sample-top">SAMPLE EXPERIENCE · FICTIONAL PREVIEW</span>}<div className="report-heading"><span className="avatar-initial">{r.displayName.slice(0, 1)}</span><div><b>{r.displayName}</b><small>{r.ownershipMonths} months · {r.milesDriven.toLocaleString()} miles</small></div><span className="report-rating">{r.rating.toFixed(1)} / 5</span></div><h2 className="serif">{sc ? sc.title : r.title}</h2><p>{sc ? sc.body : r.body}</p>{sc && <div className="preview-block"><span className="preview-label">FICTIONAL SAMPLE DETAILS</span><ul className="preview-fields">{sc.fields.map(t => <li key={t}>{t}</li>)}</ul></div>}<div className="community-meta"><span>{r.vehicleLabel}</span>{r.reportedProblem && <span><Wrench size={13}/> {r.reportedProblem}</span>}</div></article>; })}</div> : <EmptyBlock title="No sample experiences match" text="Try another manufacturer filter."/>}
  </div></Shell>;
}

function AboutPage() {
  const covers = [['Reliability research', 'Estimated reliability and the questions behind a score.'], ['Maintenance expectations', 'What routine care may involve over the years.'], ['Ownership costs', 'Fuel, insurance, repairs and depreciation beyond the price.'], ['Specifications', 'Powertrains, trims and the numbers that differ between them.'], ['Known and reported issues', 'Problems worth asking about before you buy.'], ['Owner perspectives', 'Experiences from people who live with the car. Owner submissions are coming soon.'], ['Comparison tools', 'Up to four vehicles side by side.']];
  return <Shell><div className="content-wrap page-wrap about-page"><PageIntro eyebrow="WHY AUTORESEARCH" title="Better questions make better ownership." sub="A car is a purchase. Ownership is the relationship that follows. Auto Research is designed to help shoppers look beyond the purchase price and the first day."/><DemoNotice/><div className="about-lead"><span className="big-number serif">01</span><div><h2 className="serif">A guide, not a verdict.</h2><p>We bring reliability research, maintenance expectations, ownership costs, specifications, known issues, owner perspectives and comparison tools into one place, so shoppers have a clearer basis for deciding what to investigate. A score or estimate cannot decide for you.</p></div></div><section className="about-covers"><span className="eyebrow">WHAT YOU'LL FIND</span><h2 className="serif">Connected research.</h2><ul>{covers.map(([t, d]) => <li key={t}><b>{t}</b><span>{d}</span></li>)}</ul><p className="about-note">Vehicle profiles follow a clear hierarchy: manufacturer, model, generation, model year and trim. Each piece of research belongs to the most relevant vehicle profile.</p></section><div className="about-columns"><article><span className="eyebrow">SOURCE TRANSPARENCY</span><h3 className="serif">What is demo data today.</h3><p>Every vehicle record, estimate and owner report in this first version is DEMO / ESTIMATE data. It is illustrative, not verified guidance, a warranty, an inspection, or a substitute for manufacturer documentation. These notices are expected to become smaller and specific to each figure once verified sources are connected.</p></article><article><span className="eyebrow">OWNER REPORTS AND RESEARCHED ISSUES</span><h3 className="serif">Two different things.</h3><p>Owner reports will be experiences submitted by AutoResearch users. Researched owner-reported issues will be patterns drawn from external sources. We intend to keep them separate and labeled, and neither is available as real data yet.</p></article></div><section className="official-sources"><span className="eyebrow">FOR THE THINGS THAT MUST BE CURRENT</span><h2 className="serif">Go to the authoritative source.</h2><p>Recall and safety status can change by vehicle and VIN, and fuel economy figures come from EPA testing. We do not verify those records here. Over time we aim to show sourced information in the site and link back to the original source.</p><div><a href="https://www.nhtsa.gov/recalls" target="_blank" rel="noreferrer"><Shield size={18}/> NHTSA recalls by VIN <ArrowUpRight size={15}/></a><a href="https://www.nhtsa.gov/ratings" target="_blank" rel="noreferrer"><BadgeCheck size={18}/> NHTSA safety ratings <ArrowUpRight size={15}/></a><a href="https://www.fueleconomy.gov/" target="_blank" rel="noreferrer"><Fuel size={18}/> EPA fuel economy <ArrowUpRight size={15}/></a></div></section><div className="about-bottom"><span className="eyebrow">BE CURIOUS. VERIFY. THEN DECIDE.</span><Link href="/browse" className="button dark">Explore the vehicle index <ArrowRight size={15}/></Link></div></div></Shell>;
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