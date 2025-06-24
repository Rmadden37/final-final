export default function TestPage() {
  return (
    <div style={{ padding: '20px', fontSize: '18px' }}>
      <h1>Test Page</h1>
      <p>If you can see this, Next.js is working!</p>
      <p>Current time: {new Date().toISOString()}</p>
    </div>
  );
}
