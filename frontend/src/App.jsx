import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/NavBar";
import Dashboard from "./pages/Dashboard";
import ProductSearch from "./pages/ProductSearch";
import ForecastPage from "./pages/ForecastPage";
import FairPriceChecker from "./pages/FairPriceChecker";
import MarketComparison from "./pages/MarketComparison";
import GroceryBasket from "./pages/GroceryBasket";

export default function App() {
    return (
        <BrowserRouter>
            <Navbar />
            <main style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px" }}>
                <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/search" element={<ProductSearch />} />
                    <Route path="/forecast" element={<ForecastPage />} />
                    <Route path="/fair-price" element={<FairPriceChecker />} />
                    <Route path="/markets" element={<MarketComparison />} />
                    <Route path="/basket" element={<GroceryBasket />} />
                </Routes>
            </main>
        </BrowserRouter>
    );
}