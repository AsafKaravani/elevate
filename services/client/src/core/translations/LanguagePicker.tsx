import { ToggleButtonGroup, ToggleButton } from '@mui/material';
import React, { ReactElement, FC } from 'react';
import { useTranslation } from 'react-i18next';

interface TProps extends React.PropsWithChildren {}

const languages = ['he', 'en'];

export const LanguagePicker: FC<TProps> = React.memo(props => {
	const { i18n } = useTranslation();

	const [language, setLanguage] = React.useState<string>(i18n.language);
	
	const handleChange = (event: React.MouseEvent<HTMLElement>, newLanguage: string | null) => {
		if (!newLanguage) return;
		setLanguage(newLanguage);
		i18n.changeLanguage(newLanguage);
		document.dir = i18n.dir();
		document.body.dir = i18n.dir();
	};

	return (
		<ToggleButtonGroup color="primary" value={language} exclusive onChange={handleChange} aria-label="Platform">
			{languages.map((lang: string) => (
				<ToggleButton  className="p-2 py-1 border-none bg-black bg-opacity-25" key={lang} value={lang}>
					<img className="w-4 h-4" src={`/flags/${lang}.png`} alt="flag" />
				</ToggleButton>
			))}
		</ToggleButtonGroup>
	);
});
