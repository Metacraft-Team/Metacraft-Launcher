import leftSideBg from '@common/assets/left-side-bg.svg'
import { Space } from 'antd'
import styled from 'styled-components'

export const SocialMediaContainer = styled.div`
  margin-top: 36px;
  margin-bottom: 20px;
  width: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  grid-row-gap: 24px;
  grid-column-gap: 60px;
`

export const SocialMediaIcon = styled.div`
  display: flex;
  align-items: center;
  color: #fff;
  font-size: 16px;
  cursor: pointer;

  > img {
    margin-right: 16px;
    width: 50px;
    height: 50px;
    object-fit: cover;
  }
`

/** login & cancel button */
export const BaseButton = styled.div`
  width: 100%;
  height: 56px;
  color: #fff !important;
  border-radius: 16px;
  font-size: 18px;
  line-height: 24px;
  font-weight: bold;
  border: none;
`

export const ButtonGroup = styled(Space)`
  width: 100%;
`

export const CenteredButton = styled(BaseButton)`
  position: relative;
  margin-top: 40px;
  background: ${props => props.theme.palette.blue[500]} !important;
  cursor: pointer;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
`

export const CancelButton = styled(CenteredButton)`
  margin-top: 16px;
  background: ${props => props.theme.palette.colors.orange} !important;
`

/** account informations  */
export const AccountInfoContainer = styled(Space)`
  width: 100%;
  margin: 40px 0 32px 0;
`

export const AccountInfoLabel = styled.div`
  margin-bottom: 8px;
  font-style: normal;
  font-weight: 500;
  font-size: 14px;
  line-height: 20px;
  letter-spacing: 0.175px;
  color: #f8f8f8;
  opacity: 0.65;
`

export const AccountInfoContent = styled.div`
  width: 100%;
  height: 48px;
  padding-left: 12px;
  background: #293649;
  border-radius: 15px;
  font-weight: 500;
  font-size: 16px;
  line-height: 48px;
  letter-spacing: 0.2px;
  color: #f8f8f8;
`

export const HelpLink = styled.a`
  margin-top: 32px;
  display  block;
  text-align: center;
  font-size: 16px;
  line-height: 20px;
  color: #f8f8f8;
  cursor: pointer;
`

export const Logo = styled.img`
  width: 140px;
  margin-bottom: 20px;
`

export const Container = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
  position: relative;
`

export const LeftSide = styled.div`
  display: flex;
  flex-direction: column;
  position: relative;
  flex: 2;
  max-width: 640px;
  padding: 20px 60px;
  height: 100%;
  overflow-y: auto;
  transition: 0.3s ease-in-out;
  transform: translateX(
    ${({ transitionState }) =>
      transitionState === 'entering' || transitionState === 'entered'
        ? -300
        : 0}px
  );
  background: url('${leftSideBg}') 0 0 100% 100% no-repeat;

  p {
    margin-top: 1em;
    color: ${props => props.theme.palette.text.third};
  }

  & .ant-space-item {
    width: 100%;
  }
`

export const Background = styled.div`
  position: relative;
  flex: 3;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;

  > img {
    transition: 0.3s ease-in-out;
    transform: translateX(
      ${({ transitionState }) =>
        transitionState === 'entering' || transitionState === 'entered'
          ? -300
          : 0}px
    );
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    object-fit: cover;
  }
`

export const Header = styled.div`
  margin-top: 50px;
  display: flex;
  flex-direction: columns;
  justify-content: center;
  alig-items: center;
  img {
    width: 160px;
  }
`

export const Content = styled.div`
  display: flex;
  padding: 60px 0;
  flex-direction: column;
  justify-content: center;
  align-items: center;
`

export const Footer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
`

export const Loading = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  z-index: -1;
  justify-content: center;
  backdrop-filter: blur(8px) brightness(60%);
  font-size: 40px;
  transition: 0.3s ease-in-out;
  opacity: ${({ transitionState }) =>
    transitionState === 'entering' || transitionState === 'entered' ? 1 : 0};
`

export const FlexCenter = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: row;
`
