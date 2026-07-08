# কি বাজার করবো? — Ki Bazaar Korbo

**কি বাজার করবো?** is a Bangla grocery price intelligence web application that helps users make smarter shopping decisions by checking current market prices, comparing markets, forecasting future prices, checking fair price, and creating a low-cost grocery basket.

The system uses market price data from the **Agricultural Service Portal of Bangladesh** and applies AI/ML-based analysis to help users decide whether they should buy a product today or wait for a possible price drop.

---

## Live Links

### Frontend


https://ki-bazaar-korbo.vercel.app


### Backend


https://huggingface.co/spaces/Atandrila/kibazaarkorbo-backend/tree/main


---

## Main Features

### 1. Dashboard

Users can view the latest available market prices in Bangladesh.

Features:

- Search products directly
- Filter products by division
- Filter products by market
- Filter products by category
- View average, minimum, and maximum prices

---

### 2. Product Search and Price Trend

Users can select any product and view its historical price trend.

Features:

- 30-day, 60-day, 90-day, and 6-month trend options
- Latest average price
- Latest minimum price
- Latest maximum price
- Price change percentage

---

### 3. Price Forecast

The forecast page helps users decide whether they should wait or buy the product today.


Features:

- AI-based buy/wait recommendation
- Tomorrow or next update price prediction
- Predicted price range
- Price change percentage
- Savings estimate
- Risk level
- Model confidence
- 7-day future price idea

---

### 4. Fair Price Checker

Users can enter the price they paid and check whether it is fair.

Features:

- Select product
- Select division
- Select specific market
- Check against selected market price
- Shows whether the price is fair, high, or lower than the normal market range
- Gives user-friendly Bangla explanation

---

### 5. Market Comparison

Users can compare the price of one product across markets.

Features:

- Select product
- Select division
- Compare only markets from that division
- Cheapest market appears first
- Shows price range and percentage difference

---

### 6. Grocery Basket Optimizer

Users can create a grocery list and get a low-cost shopping plan.

Features:

- Add products to basket
- Set quantity
- Select division
- Calculate total estimated cost
- AI-generated low-cost buying plan
- Market ranking

---

### 7. AI Shopping Assistant

The website includes an AI assistant that can answer shopping-related questions in Bangla.

---

## Data Source

This project uses market price data collected from the:

webiste link: https://moa-services.com/market-directory/market-daily-price-report

The dataset contains information such as:

- Date
- Product name
- Minimum price
- Maximum price
- Average price
- Market name
- Division/district/upazila-related market information

Dataset Link: https://drive.google.com/file/d/1-N20H0lL7OtaD4kKpDx_aALLGS7rJ4WH/view

---

## Tech Stack

### Frontend

- React
- Vite
- JavaScript
- CSS
- Axios

### Backend

- FastAPI
- Python
- Pandas
- XGBoost / ML model
- Uvicorn

### AI / LLM

- Groq API
- AI explanation and shopping assistant

### Deployment

- Frontend: Vercel
- Backend: Hugging Face Spaces with Docker

---

## Project Structure

```txt
KiBazaarKorbo/
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── data/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── utils/
│   │   └── index.css
│   │
│   ├── package.json
│   └── vite.config.js
│
├── backend/
│   ├── main.py
│   ├── routers/
│   ├── services/
│   ├── ml/
│   │   └── models/
│   └── requirements.txt
│
├── data/
│   └── processed/
│       └── market_prices_clean.csv
│
├── scripts/
├── Dockerfile
├── .dockerignore
├── .gitignore
└── README.md
```

---

## Frontend Setup

Go to the frontend folder:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Create a `.env.local` file:

```env
VITE_API_URL=http://localhost:8000/api
```

Run the frontend:

```bash
npm run dev
```

The frontend will run at:

```txt
http://localhost:5173
```

---

## Backend Setup

Go to the backend folder:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv venv
```

Activate the virtual environment.

For Windows PowerShell:

```bash
.\venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Run the backend:

```bash
python -m uvicorn main:app --reload
```

The backend will run at:

```txt
http://localhost:8000
```

---

## Backend Environment Variables

Create a `.env` file inside the backend folder:

```env
GROQ_API_KEY=your_groq_api_key_here

GROQ_AGENT_MODEL=openai/gpt-oss-120b
GROQ_EXPLAIN_MODEL=openai/gpt-oss-120b
GROQ_TIMEOUT_SECONDS=60
GROQ_MAX_TOOL_ROUNDS=2
AGENT_SAFE_DETERMINISTIC_FINALS=1

CSV_PATH=../data/processed/market_prices_clean.csv
MODEL_PATH=ml/models/price_models.pkl.gz
```

---

## Deployment

### Frontend Deployment on Vercel

### Backend Deployment on Hugging Face Spaces

---

## Main API Endpoints

```txt
GET  /api/products
GET  /api/prices/today
GET  /api/prices/history/{product}
GET  /api/prices/markets/{product}
GET  /api/forecast/{product}
GET  /api/explain/{product}
POST /api/fair-price-check
POST /api/basket/optimize
POST /api/chat
```


---

## Limitations

- Market data depends on government portal updates.
- Some products may not have data every day.
- Forecasts are estimates, not guaranteed future prices.
- AI explanations depend on available market and model data.
- Some markets may have missing product entries.

---

## Future Improvements

- Add user location-based nearest market recommendation
- Add map-based market view
- Add more historical data
- Add notification system for price drops

---

## Team 

Mantaka Nusaiba
Atandrila Pushpa

---

