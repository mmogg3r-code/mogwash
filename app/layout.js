import './globals.css';

export const metadata = {
  title: 'Telegram Real-Time News Desk',
  description: 'Live Telegram group/channel news dashboard'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
