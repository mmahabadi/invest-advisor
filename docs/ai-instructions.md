# AI Development Instructions

## 🎯 Purpose

This document provides comprehensive instructions for AI assistants (like Claude, Cursor AI, etc.) working on the InvestAdvisor project. Follow these guidelines to maintain consistency and avoid getting lost during development.

---

## 📚 Required Reading Before Starting

Before making any changes, read these documents in order:

1. **README.md** - Project overview
2. **architecture.md** - System components and data flow
3. **features.md** - What we're building
4. **tech-stack.md** - Technologies used
5. **data-model.md** - Database schema
6. **api-design.md** - API contracts
7. **roadmap.md** - Current phase and tasks

---

## 🏗️ Project Structure

```
invest-advisor/
├── docs/                      # Documentation (you are here)
├── apps/
│   ├── backend/               # NestJS REST API
│   │   └── src/
│   │       ├── auth/          # Authentication
│   │       ├── users/         # User management
│   │       ├── portfolio/     # Portfolio CRUD
│   │       ├── watchlist/     # Watchlist management
│   │       ├── alerts/        # Alert system
│   │       ├── market-data/   # Yahoo Finance integration
│   │       ├── predictions/   # ML Engine communication
│   │       ├── email/         # Email service
│   │       ├── scheduler/     # Cron jobs
│   │       └── common/        # Shared utilities
│   │
│   ├── web/                   # React Frontend
│   │   └── src/
│   │       ├── components/    # Reusable components
│   │       ├── pages/         # Route pages
│   │       ├── hooks/         # Custom hooks
│   │       ├── services/      # API calls
│   │       ├── stores/        # Zustand stores
│   │       └── types/         # TypeScript types
│   │
│   └── ml-engine/             # Python ML Service
│       └── app/
│           ├── api/           # FastAPI routes
│           ├── services/      # Business logic
│           ├── models/        # ML model classes
│           └── utils/         # Utilities
│
└── libs/
    ├── shared-types/          # Shared TypeScript types
    └── utils/                 # Shared utilities
```

---

## ✅ Development Rules

### General Rules

1. **Always check roadmap.md** before starting a task to understand current phase
2. **Follow existing patterns** - look at existing code before creating new
3. **Keep it simple** - no over-engineering, minimal abstractions
4. **Type everything** - no `any` types in TypeScript
5. **Document as you go** - update docs when making significant changes

### Backend Rules (NestJS)

```typescript
// ✅ DO: Use decorators properly
@Injectable()
export class PortfolioService {
  constructor(
    private db: DatabaseService,
    private marketData: MarketDataService,
  ) {}
}

// ✅ DO: Use DTOs for validation
export class CreatePortfolioItemDto {
  @IsString()
  symbol: string;

  @IsNumber()
  @Min(0)
  quantity: number;
}

// ✅ DO: Return proper HTTP status codes
@Post()
@HttpCode(HttpStatus.CREATED)
async create(@Body() dto: CreatePortfolioItemDto) {
  return this.service.create(dto);
}

// ❌ DON'T: Use raw SQL without parameterization
// BAD: `SELECT * FROM users WHERE id = '${id}'`
// GOOD: `SELECT * FROM users WHERE id = $1`, [id]
```

### Frontend Rules (React)

```typescript
// ✅ DO: Use TypeScript interfaces
interface PortfolioItem {
  id: string;
  symbol: string;
  quantity: number;
  avgCost: number;
}

// ✅ DO: Use TanStack Query for data fetching
const { data, isLoading } = useQuery({
  queryKey: ['portfolio'],
  queryFn: () => api.getPortfolio(),
});

// ✅ DO: Use Zustand for global state
const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));

// ❌ DON'T: Use useState for server data
// BAD: const [portfolio, setPortfolio] = useState([])
// GOOD: Use TanStack Query

// ❌ DON'T: Inline styles
// BAD: <div style={{ color: 'red' }}>
// GOOD: <div className="text-red-500">
```

### ML Engine Rules (Python)

```python
# ✅ DO: Use type hints
def calculate_rsi(df: pd.DataFrame, period: int = 14) -> float:
    pass

# ✅ DO: Use Pydantic for request/response
class TargetPriceResponse(BaseModel):
    buy_target: float
    sell_target: float
    confidence: int

# ✅ DO: Handle errors gracefully
@router.get("/analyze/{symbol}")
async def analyze(symbol: str):
    try:
        result = await analyzer.analyze(symbol)
        return result
    except SymbolNotFoundError:
        raise HTTPException(status_code=404, detail="Symbol not found")

# ❌ DON'T: Hardcode API keys
# BAD: API_KEY = "sk-xxx"
# GOOD: API_KEY = os.getenv("API_KEY")
```

---

## 📁 File Naming Conventions

### Backend
```
module-name/
├── module-name.module.ts      # NestJS module
├── module-name.service.ts     # Business logic
├── module-name.controller.ts  # HTTP handlers
├── dto/
│   ├── create-module-name.dto.ts
│   └── update-module-name.dto.ts
└── entities/
    └── module-name.entity.ts
```

### Frontend
```
components/
├── ComponentName/
│   ├── ComponentName.tsx      # Component
│   ├── ComponentName.test.tsx # Tests
│   └── index.ts               # Export

pages/
├── PageName.tsx               # Page component
└── PageName.module.css        # Optional CSS module
```

### ML Engine
```
services/
├── service_name.py            # snake_case for Python
models/
├── model_name.py
```

---

## 🔄 Common Workflows

### Adding a New Backend Feature

1. **Create migration** (if DB changes needed)
   ```sql
   -- migrations/XXXX_add_feature.sql
   CREATE TABLE new_table (...);
   ```

2. **Create DTO**
   ```typescript
   // dto/create-feature.dto.ts
   export class CreateFeatureDto { ... }
   ```

3. **Create Service**
   ```typescript
   // feature.service.ts
   @Injectable()
   export class FeatureService { ... }
   ```

4. **Create Controller**
   ```typescript
   // feature.controller.ts
   @Controller('features')
   export class FeatureController { ... }
   ```

5. **Register in Module**
   ```typescript
   // feature.module.ts
   @Module({
     controllers: [FeatureController],
     providers: [FeatureService],
   })
   export class FeatureModule {}
   ```

6. **Add to App Module**
   ```typescript
   // app.module.ts
   imports: [..., FeatureModule]
   ```

### Adding a New Frontend Page

1. **Create Page Component**
   ```typescript
   // pages/NewPage.tsx
   export default function NewPage() { ... }
   ```

2. **Add Route**
   ```typescript
   // App.tsx
   <Route path="/new-page" element={<NewPage />} />
   ```

3. **Add Navigation Link**
   ```typescript
   // components/Sidebar.tsx
   <NavLink to="/new-page">New Page</NavLink>
   ```

4. **Create API Service** (if needed)
   ```typescript
   // services/newPageApi.ts
   export const getNewPageData = () => api.get('/new-page');
   ```

### Adding ML Endpoint

1. **Create Schema**
   ```python
   # schemas/new_feature.py
   class NewFeatureRequest(BaseModel): ...
   class NewFeatureResponse(BaseModel): ...
   ```

2. **Create Service**
   ```python
   # services/new_feature.py
   class NewFeatureService: ...
   ```

3. **Create Route**
   ```python
   # api/routes/new_feature.py
   @router.post("/new-feature")
   async def new_feature(): ...
   ```

4. **Include Router**
   ```python
   # main.py
   app.include_router(new_feature_router)
   ```

---

## ⚠️ Common Pitfalls to Avoid

### 1. Database Queries
```typescript
// ❌ WRONG: No error handling
const result = await this.db.query('SELECT * FROM users WHERE id = $1', [id]);
return result.rows[0];

// ✅ RIGHT: With error handling
const result = await this.db.query('SELECT * FROM users WHERE id = $1', [id]);
if (result.rows.length === 0) {
  throw new NotFoundException('User not found');
}
return result.rows[0];
```

### 2. Authentication
```typescript
// ❌ WRONG: Forgetting auth guard
@Get()
async getSecretData() { ... }

// ✅ RIGHT: Protected endpoint
@Get()
@UseGuards(AuthGuard)
async getSecretData() { ... }

// Or if using global guard, mark public routes:
@Public()
@Get('public')
async getPublicData() { ... }
```

### 3. Frontend State
```typescript
// ❌ WRONG: Not handling loading states
const { data } = useQuery({ queryKey: ['data'], queryFn: fetchData });
return <div>{data.items.map(...)}</div>; // Crashes if data is undefined

// ✅ RIGHT: Handle all states
const { data, isLoading, error } = useQuery({ ... });
if (isLoading) return <Loading />;
if (error) return <Error message={error.message} />;
return <div>{data.items.map(...)}</div>;
```

### 4. ML Predictions
```python
# ❌ WRONG: Not validating input data
def predict(symbol: str):
    data = fetch_data(symbol)  # Might be empty
    return model.predict(data)  # Crashes

# ✅ RIGHT: Validate everything
def predict(symbol: str):
    data = fetch_data(symbol)
    if data is None or len(data) < 60:
        raise ValueError(f"Insufficient data for {symbol}")
    return model.predict(data)
```

---

## 🎨 UI/UX Guidelines

### Color Palette (TailwindCSS)
```css
/* Primary */
--primary: #1a365d;      /* Deep blue */
--primary-light: #2c5282;

/* Status */
--success: #38a169;      /* Green - profit */
--danger: #e53e3e;       /* Red - loss */
--warning: #d69e2e;      /* Yellow - alerts */

/* Neutral */
--bg-dark: #1a202c;
--bg-light: #f7fafc;
--text: #1a202c;
--text-muted: #718096;
```

### Component Patterns
```tsx
// Card component pattern
<Card>
  <CardHeader>
    <CardTitle>Portfolio Value</CardTitle>
    <CardDescription>Total investment value</CardDescription>
  </CardHeader>
  <CardContent>
    <p className="text-3xl font-bold">$12,500.00</p>
    <p className="text-green-500">+$2,500 (25%)</p>
  </CardContent>
</Card>

// Data table pattern
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Symbol</TableHead>
      <TableHead>Price</TableHead>
      <TableHead>Change</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {items.map(item => (
      <TableRow key={item.id}>
        <TableCell>{item.symbol}</TableCell>
        <TableCell>${item.price}</TableCell>
        <TableCell className={item.change > 0 ? 'text-green-500' : 'text-red-500'}>
          {item.change}%
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

---

## 📊 Key Business Logic

### Target Price Calculation

The system generates buy/sell targets using this logic:

```
BUY TARGET = Current Price × (1 - discount)

Where discount is calculated from:
- Technical score (-1 to 1): bullish = less discount
- Sentiment score (-1 to 1): positive = less discount  
- Support level proximity
- Base discount: 3%

Constraints:
- Never below strong support
- Minimum 1% below current price
```

```
SELL TARGET = max(resistance_based, prediction_based)

Where:
- Resistance based = resistance × 0.6 + prediction × 0.4
- Minimum target = current price × 1.08 (8% gain)

Risk/Reward ratio should be at least 2:1
```

### Confidence Score

```
Confidence = (tech_confidence × 0.4) + 
             (prediction_confidence × 0.4) + 
             (sentiment_confidence × 0.2)

Where each component is 0-100
```

### Recommendation Logic

```
STRONG BUY: confidence ≥ 80 AND within 2% of buy target AND tech_score > 0.5
BUY:        confidence ≥ 70 AND within 5% of buy target AND tech_score > 0
HOLD:       default when not buy/sell/avoid
SELL:       potential gain < 5%
AVOID:      confidence < 50 OR tech_score < -0.5
```

---

## 🔧 Debugging Tips

### Backend Issues
```bash
# Check logs
docker logs invest-advisor-backend

# Test endpoint directly
curl http://localhost:3000/api/v1/health

# Check database connection
docker exec -it postgres psql -U postgres -d invest_advisor
```

### Frontend Issues
```bash
# Check browser console for errors
# Check Network tab for API calls

# Verify environment variables
console.log(import.meta.env.VITE_API_URL);
```

### ML Engine Issues
```bash
# Check logs
docker logs invest-advisor-ml-engine

# Test endpoint
curl http://localhost:8000/health

# Debug in Python
import logging
logging.basicConfig(level=logging.DEBUG)
```

---

## 📝 When Stuck

If you encounter issues:

1. **Check the error message carefully**
2. **Search the codebase** for similar patterns
3. **Re-read relevant documentation**
4. **Check the roadmap** - maybe the feature isn't implemented yet
5. **Ask the user** for clarification if requirements are unclear

---

## ✅ Checklist Before Committing

- [ ] Code follows existing patterns
- [ ] Types are properly defined (no `any`)
- [ ] Error handling is in place
- [ ] Loading states handled in UI
- [ ] API responses match documented format
- [ ] Database queries are parameterized
- [ ] Sensitive data not hardcoded
- [ ] Documentation updated if needed
- [ ] Roadmap updated with progress

---

## 📞 Quick Reference

### API Base URLs
- Backend: `http://localhost:3000/api/v1`
- ML Engine: `http://localhost:8000`

### Database Tables
- `users`, `portfolio_items`, `transactions`
- `watchlist_items`, `target_prices`
- `alerts`, `alert_history`
- `market_data_cache`, `email_queue`

### Key Environment Variables
- `DATABASE_URL` - PostgreSQL connection
- `REDIS_URL` - Redis connection
- `JWT_SECRET` - Auth secret
- `RESEND_API_KEY` - Email service (Resend)
- `VITE_API_URL` - Frontend API URL

---

**Remember**: When in doubt, keep it simple and follow existing patterns!
