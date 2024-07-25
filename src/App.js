import 'swiper/css';
import './assets/boxicons-2.0.7/css/boxicons.min.css';
import './App.scss';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/header/Header';
import Footer from './components/footer/Footer';
import Home from './pages/Home';
import Catalog from './pages/Catalog';
import Detail from './pages/detail/Detail';
import MultiSearch from './components/MultiSearch/MultiSearch';

function App() {
    return (
        <BrowserRouter>
            <Header />
            <Routes>
                <Route path='/:category/search/:keyword' element={<Catalog />} />
                <Route path='/:category/:id' element={<Detail />} />
                <Route path='/:category' element={<Catalog />} />
                <Route path='/' element={<Home />} />
                <Route path="/search/:keyword" element={<MultiSearch />} />
            </Routes>
            <Footer />
        </BrowserRouter>
    );
}

export default App;