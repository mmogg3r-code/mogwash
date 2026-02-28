import { Navigate, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import SlotPage from './pages/SlotPage';

const slots = [
  { id: 'neon-orbit', name: 'Neon Orbit', theme: 'Sci-Fi Fortune', volatility: 'Medium' },
  { id: 'pharaohs-code', name: "Pharaoh's Code", theme: 'Egyptian Treasure', volatility: 'High' },
  { id: 'lucky-katana', name: 'Lucky Katana', theme: 'Modern Samurai', volatility: 'Low' },
  { id: 'cyber-jackpot', name: 'Cyber Jackpot', theme: 'Tech Mega Win', volatility: 'High' }
];

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage slots={slots} />} />
      <Route path="/slot/:slotId" element={<SlotPage slots={slots} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
