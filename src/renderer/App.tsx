import WebsocketProvider from './WebsocketProvider';
import Search from './Search';

function App() {
  return (
    <WebsocketProvider>
      <Search />
    </WebsocketProvider>
  );
}

export default App;
