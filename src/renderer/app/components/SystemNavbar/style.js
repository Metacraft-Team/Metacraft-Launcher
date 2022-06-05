import styled from 'styled-components'

export const MainContainer = styled.div`
  width: 100%;
  height: ${({ theme }) => theme.sizes.height.systemNavbar}px;
  background: rgb(5, 8, 24);
  -webkit-app-region: drag;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  z-index: 999;
  color: white;
  & > * {
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    transition: background 0.1s ease-in-out;
  }
`

export const Container = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  -webkit-app-region: no-drag;
  
  & > div {
    width: ${({ theme }) => theme.sizes.height.systemNavbar}px;
    height: 100%;
    display: flex;
    justify-content: center;
    cursor: pointer;
    align-items: center;
    &:hover {
      background: ${({ theme }) => theme.palette.grey[700]};
    }
    &:active {
      background: ${({ theme }) => theme.palette.grey[600]};
    }
  }
  & > *:first-child {
    &:hover {
      background: ${({ theme }) => theme.palette.colors.red};
    }
  }
`
