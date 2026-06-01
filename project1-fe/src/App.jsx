import SessionWatcher from './components/common/SessionWatcher.jsx';
import AppRoutes from './routes/AppRoutes.jsx';

export default function App() {
  return (
    <>
      <SessionWatcher />
      <AppRoutes />
    </>
  );
}
