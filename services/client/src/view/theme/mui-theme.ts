import { Direction, createTheme } from "@mui/material";
import { red,  } from "@mui/material/colors";

export const muiTheme = (dir?: Direction ) => createTheme({
	palette: {
		primary: {
			main: getComputedStyle(document.documentElement).getPropertyValue('--primary-color'),
		},
	},

	direction: dir,
	components: {
		MuiButton: {
			defaultProps: {
				disableElevation: true,
				disableFocusRipple: true,
				disableRipple: true,
				disableTouchRipple: true,
				focusRipple: false,
				variant: 'contained'
			},
			styleOverrides: {
				root: {
					textTransform: 'none'
				}
			}
		},
		MuiTextField: {
			defaultProps: {
				InputProps: {
					disableUnderline: true
				},
				variant: 'filled'
			},
			styleOverrides: {
				root: {
					'& input': {
						padding: '10px 14px'
					}
				}
			}
		},

		MuiSelect: {
			styleOverrides: {
				root: {
					'& .MuiSelect-select': {
						padding: '4px 14px',
						height: '35px'
					},
					'& fieldset': {
						borderColor: 'transparent'
					}
				}
			}
		},
		MuiPopover: {
			defaultProps: {
				slotProps: {
					paper: {
						elevation: 0,
						className: 'shadow'
					}
				}
			}
		},

		MuiListItem: {
			defaultProps: {
				disablePadding: true
			}
		},
		MuiListItemButton: {
			defaultProps: {
				disableRipple: true
			}
		},
		MuiTooltip: {
			defaultProps: {
				arrow: true
			}
		},

		MuiAutocomplete: {
			styleOverrides: {
				root: {
					'& .MuiFilledInput-root': {
						paddingTop: '3px',
						paddingBottom: '3px'
					}
				}
			}
		}
	}
});