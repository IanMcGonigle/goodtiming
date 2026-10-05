import { ImageResponse } from 'next/og';

export const alt = 'Good Timing — Interesting watches. Found daily.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        width: '100%',
        height: '100%',
        padding: '60px',
        background: '#f2f0e8',
        color: '#222a27',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', fontSize: 18, letterSpacing: 4 }}>
        AN INDEPENDENT EYE ON WATCHES
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          fontSize: 124,
          fontWeight: 900,
          letterSpacing: -7,
          lineHeight: 0.95,
        }}
      >
        <span>GOOD</span>
        <div style={{ display: 'flex' }}>
          TIMING<span style={{ color: '#c73d26' }}>.</span>
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 26,
        }}
      >
        <span>Interesting watches. Found daily.</span>
        <span style={{ color: '#c73d26' }}>Launching soon.</span>
      </div>
    </div>,
    size,
  );
}
