import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/NavBar";
import Dashboard from "./pages/Dashboard";
import ProductSearch from "./pages/ProductSearch";
import ForecastPage from "./pages/ForecastPage";
import FairPriceChecker from "./pages/FairPriceChecker";
import MarketComparison from "./pages/MarketComparison";
import GroceryBasket from "./pages/GroceryBasket";
import AgentChat from "./pages/AgentChat";
import Footer from "./components/Footer";

export default function App() {
    return (
        <BrowserRouter>
            <div className="app-shell">
                <Navbar />
                <main className="app-main">
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/search" element={<ProductSearch />} />
                        <Route path="/forecast" element={<ForecastPage />} />
                        <Route path="/fair-price" element={<FairPriceChecker />} />
                        <Route path="/markets" element={<MarketComparison />} />
                        <Route path="/basket" element={<GroceryBasket />} />
                        <Route path="/assistant" element={<AgentChat />} />
                    </Routes>
                </main>
                 <Footer />
            </div>
        </BrowserRouter>
    );
}
