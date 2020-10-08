import styled, { StyledProps } from 'styled-components';
import { ReactStyledFlexboxgrid, Row } from 'react-styled-flexboxgrid';

type ICustomRowProps = StyledProps<ReactStyledFlexboxgrid.IRowProps> & {
	gutter?: number;
	splitAbove?: boolean;
};

const PanelCtrlRow = styled(Row).attrs((props: ICustomRowProps) => ({
	middle: 'xs',
	gutter: `${(props.gutter || props.theme.flexboxgrid.gutterWidth || 0)}rem`,
	cssSplitterAbove: props.splitAbove && `
		border-top: 1px solid ${props.theme.color.border};
		padding-top: ${(props.gutter || props.theme.flexboxgrid.gutterWidth || 0)}rem;
	`
}))`
	margin: ${props => props.gutter} ${props => props.gutter} 0;
	${({ cssSplitterAbove }) => cssSplitterAbove || ''}

	&:last-child {
		margin-bottom: ${props => props.gutter};
	}
`;

export default PanelCtrlRow;
