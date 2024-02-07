import { AppTheme } from './view/theme/AppTheme';
import { AppRouter } from './core/routing/AppRouter';
import { AppState } from './core/state/AppState';

function App() {
	return (
		<>
			<AppState>
				<AppTheme>
					<AppRouter />
				</AppTheme>
			</AppState>
		</>
	);
}

export default App;
