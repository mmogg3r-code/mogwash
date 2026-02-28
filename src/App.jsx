import { Navigate, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import SlotPage from './pages/SlotPage';
import { slots } from './data/slots';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage slots={slots} />} />
      <Route path="/slot/:slotId" element={<SlotPage slots={slots} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
