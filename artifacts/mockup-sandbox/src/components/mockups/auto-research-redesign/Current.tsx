import { useState, type FormEvent, type ReactNode } from 'react';
import './_group.css';
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  CircleAlert,
  Info,
  Menu,
  Search,
} from 'lucide-react';

type VehicleSummary = {
  id: string;
  year: number;
  make: string;
  makeSlug: string;
  model: string;
  trim: string;
  generation: string;
  drivetrain: string;
  bodyType: string;
  imageKey: string;
  reliabilityEstimate: number;
  annualOwnershipEstimateUsd: number;
};

type Make = {
  id: string;
  name: string;
  slug: string;
  mark: string;
  vehicleCount: number;
};

const vehicles: VehicleSummary[] = [
  {
    id: 'ford-f150-xlt',
    year: 2024,
    make: 'Ford',
    makeSlug: 'ford',
    model: 'F-150',
    trim: 'XLT',
    generation: '14th generation',
    drivetrain: '4WD',
    bodyType: 'PICKUP',
    imageKey: 'pickup',
    reliabilityEstimate: 7.2,
    annualOwnershipEstimateUsd: 11240,
  },
  {
    id: 'toyota-rav4-xle',
    year: 2024,
    make: 'Toyota',
    makeSlug: 'toyota',
    model: 'RAV4',
    trim: 'XLE',
    generation: '5th generation',
    drivetrain: 'AWD',
    bodyType: 'SUV',
    imageKey: 'suv',
    reliabilityEstimate: 8.4,
    annualOwnershipEstimateUsd: 8240,
  },
  {
    id: 'tesla-model-y-long-range',
    year: 2024,
    make: 'Tesla',
    makeSlug: 'tesla',
    model: 'Model Y',
    trim: 'Long Range',
    generation: '1st generation',
    drivetrain: 'AWD',
    bodyType: 'CROSSOVER',
    imageKey: 'suv',
    reliabilityEstimate: 7.1,
    annualOwnershipEstimateUsd: 9340,
  },
  {
    id: 'honda-civic-sport',
    year: 2024,
    make: 'Honda',
    makeSlug: 'honda',
    model: 'Civic',
    trim: 'Sport',
    generation: '11th generation',
    drivetrain: 'FWD',
    bodyType: 'SEDAN',
    imageKey: 'sedan',
    reliabilityEstimate: 8.1,
    annualOwnershipEstimateUsd: 7130,
  },
  {
    id: 'chevrolet-silverado-lt',
    year: 2024,
    make: 'Chevrolet',
    makeSlug: 'chevrolet',
    model: 'Silverado 1500',
    trim: 'LT',
    generation: '4th generation',
    drivetrain: '4WD',
    bodyType: 'PICKUP',
    imageKey: 'pickup',
    reliabilityEstimate: 7.0,
    annualOwnershipEstimateUsd: 10980,
  },
];

const popularItems = vehicles.slice(0, 4);
const trendingItems = [vehicles[2], vehicles[0], vehicles[1], vehicles[4], vehicles[3]];
const makes: Make[] = [
  { id: 'ford', name: 'Ford', slug: 'ford', mark: 'F', vehicleCount: 18 },
  { id: 'toyota', name: 'Toyota', slug: 'toyota', mark: 'T', vehicleCount: 16 },
  { id: 'honda', name: 'Honda', slug: 'honda', mark: 'H', vehicleCount: 12 },
  { id: 'chevrolet', name: 'Chevrolet', slug: 'chevrolet', mark: 'C', vehicleCount: 15 },
  { id: 'tesla', name: 'Tesla', slug: 'tesla', mark: 'T', vehicleCount: 7 },
];
const discoveryStats = { vehicleCount: 68, makeCount: 12 };

type QueryResult<T> = {
  data: T;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
};

const queryResult = <T,>(data: T): QueryResult<T> => ({
  data,
  isLoading: false,
  isError: false,
  refetch: () => undefined,
});

function useListMakes() {
  return queryResult(makes);
}

function useListPopularVehicles() {
  return queryResult(popularItems);
}

function useListTrendingVehicles() {
  return queryResult(trendingItems);
}

function useGetDiscoveryStats() {
  return queryResult(discoveryStats);
}

function useListVehicles(_options: { limit: number }) {
  return queryResult(vehicles);
}

function useLocation(): [string, (nextLocation: string) => void] {
  const [location, setLocation] = useState('/');
  return [location, setLocation];
}

const money = (n?: number | null) =>
  n == null
    ? '—'
    : new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(n);
const label = (v: VehicleSummary) =>
  `${v.year} ${v.make} ${v.model}${v.trim ? ` ${v.trim}` : ''}`;

function Link({
  href,
  className,
  children,
  onClick,
  ...props
}: {
  href: string;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
  [key: string]: unknown;
}) {
  return (
    <a
      href={href}
      className={className}
      onClick={(event) => {
        event.preventDefault();
        onClick?.();
      }}
      {...props}
    >
      {children}
    </a>
  );
}

function LoadingBlock() {
  return (
    <div className="skeleton-grid">
      <div className="skeleton tall" />
      <div className="skeleton" />
      <div className="skeleton" />
    </div>
  );
}

function ErrorBlock({ retry }: { retry: () => void }) {
  return (
    <div className="state-box">
      <CircleAlert />
      <h3>We couldn't load this research</h3>
      <p>Give it another try in a moment.</p>
      <button className="button secondary" onClick={retry}>
        Try again
      </button>
    </div>
  );
}

function EmptyBlock({
  title = 'No vehicles found',
  text = 'Try broadening your search or clearing a filter.',
}: {
  title?: string;
  text?: string;
}) {
  return (
    <div className="state-box">
      <Search />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function DemoNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`demo-notice ${compact ? 'compact' : ''}`}>
      <Info size={15} />
      <span>
        <b>DEMO / ESTIMATE DATA</b> — Illustrative only, not verified automotive
        guidance. Confirm recalls and safety information with{' '}
        <a href="https://www.nhtsa.gov/recalls" target="_blank" rel="noreferrer">
          NHTSA
        </a>{' '}
        and the vehicle manufacturer.
      </span>
    </div>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  const nav = [
    ['Home', '/'],
    ['Browse cars', '/browse'],
    ['Compare', '/compare'],
    ['Calculator', '/calculator'],
    ['Community', '/community'],
    ['About', '/about'],
  ];
  return (
    <header className="site-header">
      <Link href="/" className="brand">
        <span className="brand-mark">ar</span>
        <span>
          auto<span className="brand-light">research</span>
          <small>THE LONG VIEW ON CARS</small>
        </span>
      </Link>
      <button
        className="mobile-menu"
        aria-label="Toggle navigation"
        onClick={() => setOpen(!open)}
      >
        <Menu size={21} />
      </button>
      <nav className={open ? 'nav-open' : ''}>
        {nav.map(([name, href]) => (
          <Link key={href} href={href} onClick={() => setOpen(false)}>
            {name}
          </Link>
        ))}
      </nav>
      <Link href="/browse" className="header-cta">
        Find a car <ArrowRight size={15} />
      </Link>
    </header>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="grain min-h-[100dvh]">
      <Header />
      <main>{children}</main>
      <footer className="footer">
        <Link href="/" className="brand">
          <span className="brand-mark">ar</span>
          <span>
            auto<span className="brand-light">research</span>
          </span>
        </Link>
        <span>Independent thinking for the long road.</span>
        <Link href="/about">
          How we handle data <ArrowUpRight size={14} />
        </Link>
      </footer>
    </div>
  );
}

function Reliability({ score, size = 'normal' }: { score: number; size?: string }) {
  const safe = Math.max(0, Math.min(10, score));
  return (
    <div className={`reliability ${size}`}>
      <span className="score">{safe.toFixed(1)}</span>
      <span className="score-meta">
        <span className="score-track">
          <i style={{ width: `${safe * 10}%` }} />
        </span>
        <small>EST. / 10</small>
      </span>
    </div>
  );
}

function VehicleCard({
  vehicle,
  onCompare,
  selected = false,
}: {
  vehicle: VehicleSummary;
  onCompare?: (vehicle: VehicleSummary) => void;
  selected?: boolean;
}) {
  return (
    <article className="vehicle-card">
      <div
        className={`car-art art-${(vehicle.imageKey || 'sedan')
          .replace(/[^a-z0-9]/gi, '')
          .toLowerCase()}`}
        aria-hidden="true"
      >
        <div className="art-sun" />
        <div className="car-silhouette">
          <span />
        </div>
        <span className="art-caption">{vehicle.bodyType || 'OWNERSHIP PROFILE'}</span>
      </div>
      <div className="vehicle-card-body">
        <div className="card-overline">
          {vehicle.year} · {vehicle.generation || 'MODEL YEAR'}
        </div>
        <Link href={`/vehicles/${vehicle.id}`} className="vehicle-title serif">
          {vehicle.make} {vehicle.model}
        </Link>
        <div className="trim-line">
          {vehicle.trim} <span>·</span> {vehicle.drivetrain}
        </div>
        <div className="vehicle-score-row">
          <Reliability score={vehicle.reliabilityEstimate} />
          <span className="estimate-caption">estimated reliability</span>
        </div>
        <div className="vehicle-card-foot">
          <span>
            <b>{money(vehicle.annualOwnershipEstimateUsd)}</b>
            <small>annual ownership est.</small>
          </span>
          <Link
            href={`/vehicles/${vehicle.id}`}
            className="circle-link"
            aria-label={`View ${label(vehicle)}`}
          >
            <ArrowRight size={17} />
          </Link>
        </div>
        {onCompare && (
          <button
            className={`compare-toggle ${selected ? 'chosen' : ''}`}
            onClick={() => onCompare(vehicle)}
          >
            {selected ? <Check size={14} /> : <span className="plus">+</span>}
            {selected ? 'Added to compare' : 'Add to compare'}
          </button>
        )}
      </div>
    </article>
  );
}

function SectionHeading({
  kicker,
  title,
  link,
  href,
}: {
  kicker: string;
  title: string;
  link?: string;
  href?: string;
}) {
  return (
    <div className="section-heading">
      <div>
        <span className="eyebrow">{kicker}</span>
        <h2 className="serif">{title}</h2>
      </div>
      {link && href && (
        <Link href={href} className="text-link">
          {link} <ArrowRight size={15} />
        </Link>
      )}
    </div>
  );
}

function HomePage() {
  const makes = useListMakes();
  const popular = useListPopularVehicles();
  const trending = useListTrendingVehicles();
  const stats = useGetDiscoveryStats();
  const selectorVehicles = useListVehicles({ limit: 100 });
  const [q, setQ] = useState('');
  const [searchYear, setSearchYear] = useState('');
  const [searchMake, setSearchMake] = useState('');
  const [searchModel, setSearchModel] = useState('');
  const [searchTrim, setSearchTrim] = useState('');
  const [loc, setLoc] = useLocation();
  const options = selectorVehicles.data || [];
  const searchYears = [...new Set(options.map((v) => v.year))].sort((a, b) => b - a);
  const searchModels = [
    ...new Set(
      options
        .filter(
          (v) =>
            (!searchMake || v.makeSlug === searchMake) &&
            (!searchYear || v.year === Number(searchYear)),
        )
        .map((v) => v.model),
    ),
  ];
  const searchTrims = [
    ...new Set(
      options
        .filter(
          (v) =>
            (!searchMake || v.makeSlug === searchMake) &&
            (!searchYear || v.year === Number(searchYear)) &&
            (!searchModel || v.model === searchModel),
        )
        .map((v) => v.trim),
    ),
  ];
  const find = (event: FormEvent) => {
    event.preventDefault();
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

  return (
    <Shell>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="live-dot" /> RESEARCH THE OWNERSHIP, NOT THE HYPE
          </span>
          <h1 className="serif">
            Know the car
            <br />
            <em>before you</em>
            <br />
            buy it.
          </h1>
          <p>
            Look beyond the test drive. Explore what a vehicle may cost to own,
            where issues tend to show up, and how it holds up over time.
          </p>
          <form className="hero-search-form" onSubmit={find}>
            <div className="hero-search">
              <Search size={18} />
              <input
                aria-label="Search vehicles"
                placeholder="Search make, model, or year…"
                value={q}
                onChange={(event) => setQ(event.target.value)}
              />
              <button aria-label="Search">
                <ArrowRight size={19} />
              </button>
            </div>
            <div className="hero-search-selects">
              <label>
                Year
                <select
                  value={searchYear}
                  onChange={(event) => {
                    setSearchYear(event.target.value);
                    setSearchModel('');
                    setSearchTrim('');
                  }}
                >
                  <option value="">Any year</option>
                  {searchYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Make
                <select
                  value={searchMake}
                  onChange={(event) => {
                    setSearchMake(event.target.value);
                    setSearchModel('');
                    setSearchTrim('');
                  }}
                >
                  <option value="">Any make</option>
                  {(makes.data || []).map((make) => (
                    <option key={make.id} value={make.slug}>
                      {make.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Model
                <select
                  value={searchModel}
                  onChange={(event) => {
                    setSearchModel(event.target.value);
                    setSearchTrim('');
                  }}
                >
                  <option value="">Any model</option>
                  {searchModels.map((model) => (
                    <option key={model}>{model}</option>
                  ))}
                </select>
              </label>
              <label>
                Trim
                <select
                  value={searchTrim}
                  onChange={(event) => setSearchTrim(event.target.value)}
                >
                  <option value="">Any trim</option>
                  {searchTrims.map((trim) => (
                    <option key={trim}>{trim}</option>
                  ))}
                </select>
              </label>
            </div>
            <button className="button dark hero-search-submit">
              Find vehicles <ArrowRight size={15} />
            </button>
          </form>
          <div className="hero-shortcuts">
            <span>TRY</span>
            {['Ford F-150', 'Chevrolet Silverado', 'Tesla Model Y'].map((item) => (
              <button
                key={item}
                onClick={() => {
                  setQ(item);
                  setLoc(`/browse?q=${encodeURIComponent(item)}`);
                }}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-stamp">
            A clearer road
            <br />
            to your next car
          </div>
          <div className="hero-art">
            <div className="landscape-line line-one" />
            <div className="landscape-line line-two" />
            <div className="hero-car">
              <div className="window-shape" />
              <div className="wheel wheel-a" />
              <div className="wheel wheel-b" />
            </div>
            <div className="hero-road" />
          </div>
          <div className="hero-facts">
            <span>
              <b>{stats.data?.vehicleCount ?? '—'}</b> vehicle trims
            </span>
            <span>
              <b>{stats.data?.makeCount ?? '—'}</b> manufacturers
            </span>
            <span className="mono">ALL FIGURES ARE ESTIMATES</span>
          </div>
        </div>
        <div className="hero-bottom">
          <span>01 / START WITH THE LONG VIEW</span>
          <a href="#explore">
            Scroll to explore <ArrowDown size={14} />
          </a>
        </div>
      </section>
      <div className="content-wrap">
        <DemoNotice />
        <section id="explore" className="content-section">
          <SectionHeading
            kicker="THE SHORTLIST"
            title="Popular starting points"
            link="Browse all cars"
            href="/browse"
          />
          {popular.isLoading ? (
            <LoadingBlock />
          ) : popular.isError ? (
            <ErrorBlock retry={() => popular.refetch()} />
          ) : popularItems.length ? (
            <div className="vehicle-grid">
              {popularItems.slice(0, 4).map((vehicle) => (
                <VehicleCard key={vehicle.id} vehicle={vehicle} />
              ))}
            </div>
          ) : (
            <EmptyBlock />
          )}
        </section>
        <section className="split-feature">
          <div className="feature-note">
            <span className="eyebrow">NOT JUST THE STICKER PRICE</span>
            <h2 className="serif">
              Know the cost
              <br />
              of keeping it.
            </h2>
            <p>
              Fuel, maintenance, insurance, repairs and depreciation all add
              up. Build a monthly estimate that reflects how you actually
              drive.
            </p>
            <Link href="/calculator" className="button dark">
              Estimate ownership cost <ArrowRight size={16} />
            </Link>
          </div>
          <div className="cost-visual">
            <div className="cost-card">
              <span className="eyebrow">A MORE COMPLETE PICTURE</span>
              <strong className="serif">$ / month</strong>
              <div className="cost-bars">
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>
              <div className="cost-labels">
                <span>Fuel</span>
                <span>Service</span>
                <span>Cover</span>
                <span>Value</span>
              </div>
              <small>Illustrative ownership categories</small>
            </div>
            <div className="orbit orbit-a" />
            <div className="orbit orbit-b" />
            <div className="orbit-dot" />
          </div>
        </section>
        <section className="reliability-explainer">
          <div>
            <span className="eyebrow">RELIABILITY NEEDS CONTEXT</span>
            <h2 className="serif">
              A score is a starting point,
              <br />
              not a promise.
            </h2>
          </div>
          <p>
            Look at the model year, powertrain, service history and the specific
            problems reported—not just one number. Our demo ratings are
            illustrative and should guide questions, not replace a qualified
            inspection.
          </p>
          <Link href="/browse?sort=reliability" className="text-link">
            Browse reliability estimates <ArrowRight size={15} />
          </Link>
        </section>
        <section className="content-section">
          <SectionHeading
            kicker="IN THE CONVERSATION"
            title="Most researched this week"
            link="See all vehicles"
            href="/browse?sort=popular"
          />
          {trending.isLoading ? (
            <LoadingBlock />
          ) : trending.isError ? (
            <ErrorBlock retry={() => trending.refetch()} />
          ) : trendingItems.length ? (
            <div className="trend-list">
              {trendingItems.slice(0, 5).map((vehicle, index) => (
                <Link
                  key={vehicle.id}
                  href={`/vehicles/${vehicle.id}`}
                  className="trend-row"
                >
                  <span className="trend-rank mono">0{index + 1}</span>
                  <span className="trend-name">
                    <small>
                      {vehicle.year} / {vehicle.trim}
                    </small>
                    <b className="serif">
                      {vehicle.make} {vehicle.model}
                    </b>
                  </span>
                  <span className="trend-cost">
                    {money(vehicle.annualOwnershipEstimateUsd)}
                    <small>annual est.</small>
                  </span>
                  <Reliability score={vehicle.reliabilityEstimate} size="small" />
                  <ArrowUpRight size={17} />
                </Link>
              ))}
            </div>
          ) : (
            <EmptyBlock />
          )}
        </section>
        <section className="makes-section">
          <div className="makes-intro">
            <span className="eyebrow">EXPLORE THE FIELD</span>
            <h2 className="serif">
              Start with
              <br />a name you know.
            </h2>
            <p>
              Browse manufacturer profiles and compare the vehicles in their
              lineup.
            </p>
          </div>
          <div className="make-list">
            {makes.isLoading ? (
              <div className="skeleton" />
            ) : makes.isError ? (
              <button
                className="button secondary"
                onClick={() => makes.refetch()}
              >
                Retry manufacturers
              </button>
            ) : (
              (makes.data || []).map((make, index) => (
                <Link
                  href={`/manufacturers/${make.slug}`}
                  className="make-row"
                  key={make.id}
                >
                  <span className="make-mark">{make.mark}</span>
                  <span>
                    <b>{make.name}</b>
                    <small>{make.vehicleCount} researched trims</small>
                  </span>
                  <span className="make-index mono">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <ArrowUpRight size={16} />
                </Link>
              ))
            )}
          </div>
        </section>
        <section className="closing-cta">
          <div>
            <span className="eyebrow">A GOOD DECISION TAKES CONTEXT</span>
            <h2 className="serif">
              Compare the things
              <br />
              that matter after day one.
            </h2>
          </div>
          <Link href="/compare" className="button light">
            Build a comparison <ArrowRight size={16} />
          </Link>
        </section>
      </div>
    </Shell>
  );
}

export function Current() {
  return <HomePage />;
}