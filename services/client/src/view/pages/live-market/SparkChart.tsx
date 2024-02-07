import useDemoConfig from './useDemoConfig';
import React from 'react';
import { AxisOptions, Chart, UserSerie } from 'react-charts';

export default function Line() {
	const { data, randomizeData } = useDemoConfig({
		series: 1,
		dataType: 'time'
	});

	const primaryAxis = React.useMemo<AxisOptions<(typeof data)[number]['data'][number]>>(
		() => ({
			getValue: datum => datum.primary as unknown as Date,
			show: false
		}),
	[]
	);

	const secondaryAxes = React.useMemo<AxisOptions<(typeof data)[number]['data'][number]>[]>(
		() => [{
			getValue: datum => datum.secondary,
			show: false,
			showDatumElements: false
		}],
	[]
	);

	 
	const getSeriesStyle = React.useCallback((series: any) => {
		console.log(series.datums);

		// Based off my chart bars
		const firstValue = series.datums[0].secondaryValue;
		const lastValue = series.datums[series.datums.length - 1].secondaryValue;
		console.log(firstValue, lastValue);

		const isDecreasing = lastValue < firstValue;
		return {
			color: isDecreasing ? '#ff3939' : '#81ce39'
		};
	}, []);

	return (
		<>
			<button className="opacity-0" onClick={randomizeData}>
				Randomize Data
			</button>
			<br />
			<br />
			<Chart
				options={{
					data,
					primaryAxis,
					secondaryAxes,
					tooltip: false,
					getSeriesStyle: getSeriesStyle
				}}
			/>
		</>
	);
}
