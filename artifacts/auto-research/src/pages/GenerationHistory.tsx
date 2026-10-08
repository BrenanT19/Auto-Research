import { Link, useParams } from "wouter";
import type { ReactNode } from "react";
import { useState } from "react";
import { useGetGenerationHistory, useListGenerationHistories } from "@workspace/api-client-react";
import type {
  GenerationHistoryEvent,
  GenerationHistoryIndex,
  GenerationHistoryModelSummary,
  GenerationHistoryDetail,
} from "@workspace/api-client-react";
import { ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, CircleAlert, History, Search, ShieldCheck, X } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

const yearRange = (start: number, end: number) => start === end ? String(start) : `${start}–${end}`;
const hasSourceEntries = (model: GenerationHistoryModelSummary) => model.historyStatus === "partial";

function HistoryShell({ children }: { children: ReactNode }) {
  return <div className="history-page"><div className="history-topline"><span>THE LONG VIEW / RESEARCH ARCHIVE</span><span>MODEL HISTORY · SOURCED RECORDS</span></div>{children}</div>;
}

function HistoryUnavailable({ retry, detail = false }: { retry: () => void; detail?: boolean }) {
  return <div className="history-unavailable">
    <span className="history-unavailable-icon"><CircleAlert size={20}/></span>
    <div><span className="eyebrow">DEVELOPMENT PREVIEW ONLY</span><h2>{detail ? "This model history is unavailable." : "Generation history is unavailable."}</h2>
      <p>These sourced history endpoints return 404 outside the development preview. No history has been filled in or inferred.</p>
      <button type="button" className="button secondary" onClick={retry}>Try again</button>
    </div>
  </div>;
}

function HistoryLoading() {
  return <div className="history-loading" role="status" aria-label="Loading generation history"><i/><i/><i/></div>;
}

function HistoryModelRow({ model }: { model: GenerationHistoryModelSummary }) {
  const hasHistory = hasSourceEntries(model);
  return <Link className={`history-model-row ${hasHistory ? "" : "not-researched"}`} href={`/generation-history/${model.makeSlug}/${model.modelSlug}`} onClick={() => trackEvent("generation_history_model_opened", { source: "history_index", make: model.make, model: model.model, has_sourced_history: hasHistory, catalog_year_count: model.modelYearCount })}>
    <span className="history-model-mark">{model.make.slice(0, 2).toUpperCase()}</span>
    <span className="history-model-name"><small>{model.make}</small><b>{model.model}</b></span>
    <span className="history-model-years">{yearRange(model.firstCatalogYear, model.lastCatalogYear)}<small>{model.modelYearCount} catalog years</small></span>
    <span className={`history-status ${hasHistory ? "status-partial" : "status-pending"}`}><i/>{hasHistory ? "Partial history" : "Not yet researched"}</span>
    <span className="history-model-count">{hasHistory ? `${model.generationCount} generations · ${model.refreshCount} refreshes` : "No sourced history entries yet"}</span>
    <ArrowUpRight className="history-row-arrow" size={17}/>
  </Link>;
}

function HistoryIndexContent({ data }: { data: GenerationHistoryIndex }) {
  const [search, setSearch] = useState("");
  const sorted = [...data.models].sort((a, b) => a.make.localeCompare(b.make) || a.model.localeCompare(b.model));
  const searchTerm = search.trim().toLocaleLowerCase();
  const filtered = sorted.filter(model =>
    !searchTerm || `${model.make} ${model.model}`.toLocaleLowerCase().includes(searchTerm));
  const brands = [...new Set(filtered.map(model => model.make))];
  return <HistoryShell><header className="history-hero">
    <div className="history-hero-copy"><span className="eyebrow"><History size={13}/> MODEL LINEAGES, WITH RECEIPTS</span><h1 className="serif">Every generation<br/><em>has a story.</em></h1>
      <p>Trace documented generations and mid-cycle refreshes across the catalog. This archive is intentionally partial: a missing entry means it has not been researched here, not that it never existed.</p>
      <div className="history-hero-actions"><Link href="/browse" className="text-link"><ArrowLeft size={15}/> Back to vehicle catalog</Link><span>REVIEWED {new Date(data.reviewedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</span></div>
    </div>
     <div className="history-coverage-card"><span className="eyebrow">RESEARCH COVERAGE</span><strong className="serif">{data.coverage.modelsWithHistory}<small> / {data.coverage.totalModels}</small></strong><span className="history-coverage-caption">models with sourced entries</span>
      <div className="history-coverage-rule"><i style={{ width: `${data.coverage.totalModels ? Math.min(100, data.coverage.modelsWithHistory / data.coverage.totalModels * 100) : 0}%` }}/></div>
      <div className="history-coverage-grid"><span><b>{data.coverage.modelsWithoutHistory}</b><small>NOT YET RESEARCHED</small></span><span><b>{data.coverage.generationCount}</b><small>GENERATION GROUPS</small></span><span><b>{data.coverage.refreshCount}</b><small>REFRESHES</small></span></div>
    </div>
  </header>
  <div className="history-scope-note"><BookOpen size={17}/><p>{data.coverage.note} <b>Ranges show only years supported by sourced records; gaps are never interpolated.</b></p></div>
     <section className="history-catalog" aria-label="Generation history catalog">
     <div className="history-list-heading"><div><span className="eyebrow">{brands.length} MAKES IN THIS CATALOG</span><h2 className="serif">Browse model histories</h2></div><div className="history-legend"><span><i className="legend-researched"/> Partial sourced entries</span><span><i className="legend-pending"/> Not yet researched</span></div></div>
     <div className="history-searchbar"><label htmlFor="generation-history-search"><Search size={16}/><span className="sr-only">Search makes and models</span></label><input id="generation-history-search" type="text" autoComplete="off" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search a make or model"/>{search && <button type="button" onClick={() => setSearch("")} aria-label="Clear model search"><X size={15}/></button>}<span>{filtered.length} of {sorted.length} models</span></div>
     {brands.length ? brands.map(make => <section className="history-make-group" key={make}><h3><span>{make}</span><small>{filtered.filter(model => model.make === make).length} models</small></h3>{filtered.filter(model => model.make === make).map(model => <HistoryModelRow key={`${model.makeSlug}/${model.modelSlug}`} model={model}/>)}</section>) : <div className="history-empty-entry"><span>No models match “{search}”.</span><small>Try another make or model name.</small></div>}
  </section>
  <footer className="history-page-foot"><span>PARTIAL BY DESIGN · NO ABSENT YEARS OR GENERATIONS ARE INFERRED</span><span>{sorted.length} catalog models</span></footer>
  </HistoryShell>;
}

export function GenerationHistoryIndexPage() {
  const query = useListGenerationHistories();
  if (query.isLoading) return <HistoryShell><HistoryLoading/></HistoryShell>;
  if (query.isError || !query.data) return <HistoryShell><HistoryUnavailable retry={() => query.refetch()}/></HistoryShell>;
  return <HistoryIndexContent data={query.data}/>;
}

function EventSource({ event }: { event: GenerationHistoryEvent }) {
  return <div className="history-event-source">
    <span className="eyebrow">SOURCE RECORD</span>
    <a className="history-source-link" href={event.sourceUrl} target="_blank" rel="noreferrer">{event.sourceUrl}<ArrowUpRight size={14}/></a>
    <div className="history-locator"><b>LOCATOR</b><span>{event.locator}</span></div>
    {event.note && <p className="history-event-note">{event.note}</p>}
  </div>;
}

function EventCard({ event, index, unassigned = false }: { event: GenerationHistoryEvent; index: number; unassigned?: boolean }) {
  const isGeneration = event.kind === "generation";
  return <article className={`history-event-card ${isGeneration ? "event-generation" : "event-refresh"} ${unassigned ? "event-unassigned" : ""}`}>
    <div className="history-event-index">{String(index).padStart(2, "0")}</div>
    <div className="history-event-main"><div className="history-event-title-row"><span className={`history-event-kind ${isGeneration ? "kind-generation" : "kind-refresh"}`}>{isGeneration ? "GENERATION" : "REFRESH"}</span>{unassigned && <span className="history-ambiguous">RELATIONSHIP UNASSIGNED</span>}</div>
      <h3 className="serif">{event.name}</h3><div className="history-event-range">{yearRange(event.startYear, event.endYear)}</div>
      <EventSource event={event}/>
    </div>
  </article>;
}

function HistoryDetailContent({ data }: { data: GenerationHistoryDetail }) {
  const generationTotal = data.generations.length;
  const refreshTotal = data.generations.reduce((total, generation) => total + generation.refreshes.length, 0) + data.unassignedRefreshes.length;
  let eventNumber = 1;
  return <HistoryShell><div className="history-detail-wrap">
    <div className="history-breadcrumb"><Link href="/generation-history"><ArrowLeft size={14}/> All model histories</Link><span>/</span><span>{data.model.make}</span><span>/</span><b>{data.model.model}</b></div>
     <header className="history-detail-hero"><div><span className="eyebrow">{data.model.historyStatus === "partial" ? "PARTIAL SOURCED HISTORY" : "HISTORY NOT YET RESEARCHED"} · {data.model.make.toUpperCase()}</span><h1 className="serif">{data.model.model}<small>{data.model.make}</small></h1><p>Documented generation groups and refreshes for catalog years {yearRange(data.model.firstCatalogYear, data.model.lastCatalogYear)}. {data.model.historyStatus === "partial" ? "Only the entries shown below have been sourced; this is not a complete chronology." : "No sourced generation or refresh records are available yet; this is not evidence that none existed."}</p></div>
      <div className="history-detail-stats"><span><b>{generationTotal}</b><small>GENERATION GROUPS</small></span><span><b>{refreshTotal}</b><small>REFRESHES</small></span><span><b>{data.model.modelYearCount}</b><small>CATALOG YEARS</small></span></div>
    </header>
    <div className="history-source-guidance"><ShieldCheck size={18}/><p><b>Read the evidence, not the gaps.</b> Each date range belongs to its cited record. Unlisted years and model eras have not been inferred.</p></div>
    <section className="history-timeline"><div className="history-timeline-heading"><span className="eyebrow">CHRONOLOGY / DOCUMENTED EVENTS</span><h2 className="serif">The eras on record</h2></div>
       {data.generations.length ? data.generations.map((group, index) => <section className="history-generation-group" key={group.event.id}>
        <div className="history-generation-rail"><span>{String(index + 1).padStart(2, "0")}</span><i/></div>
        <div className="history-generation-content"><EventCard event={group.event} index={eventNumber++}/>
          {group.refreshes.length > 0 && <div className="history-refresh-list"><div className="history-refresh-label"><span/> REFRESHES ASSOCIATED WITH THIS GENERATION</div>{group.refreshes.map(event => <EventCard key={event.id} event={event} index={eventNumber++}/>)}</div>}
        </div>
       </section>) : <div className="history-empty-entry"><span>No generation groups are currently sourced for this model.</span><small>This does not establish that the model had no generations.</small></div>}
      {data.unassignedRefreshes.length > 0 && <section className="history-unassigned-section"><div className="history-unassigned-heading"><span className="eyebrow">RELATIONSHIP NOT ESTABLISHED</span><h3 className="serif">Refreshes kept unassigned</h3><p>Available evidence does not establish which generation group these refreshes belong to. They remain separate rather than being attached by assumption.</p></div>
        {data.unassignedRefreshes.map(({ event, reason }) => <div key={event.id} className="history-unassigned-item"><EventCard event={event} index={eventNumber++} unassigned/><p className="history-unassigned-reason">{reason === "overlaps_multiple_generations" ? "The year range overlaps multiple documented generations." : "No generation year range is available to establish a relationship."}</p></div>)}
      </section>}
    </section>
    <aside className="history-attribution"><BookOpen size={19}/><div><span className="eyebrow">SOURCE ATTRIBUTION</span><p>Wikipedia contributors, where Wikipedia is cited above. Article text is available under the <a href={data.rightsUrl} target="_blank" rel="noreferrer">Creative Commons Attribution-ShareAlike 4.0 International license (CC BY-SA 4.0)</a>. Consult each linked source for its specific record and locator.</p></div></aside>
    <div className="history-detail-bottom"><Link className="button secondary" href="/generation-history"><ArrowLeft size={15}/> All model histories</Link><Link className="text-link" href="/browse">Browse vehicles <ArrowRight size={15}/></Link></div>
  </div></HistoryShell>;
}

export function GenerationHistoryDetailPage() {
  const { makeSlug = "", modelSlug = "" } = useParams();
  const query = useGetGenerationHistory(makeSlug, modelSlug);
  if (query.isLoading) return <HistoryShell><HistoryLoading/></HistoryShell>;
  if (query.isError || !query.data) return <HistoryShell><div className="history-detail-wrap"><HistoryUnavailable detail retry={() => query.refetch()}/></div></HistoryShell>;
  return <HistoryDetailContent data={query.data}/>;
}
