let theme = localStorage.getItem('light')
const themeSwitch = document.getElementById('toggle_theme')

const enableLightmode = () => {
    document.documentElement.style.setProperty('--bg-color', '#cbcbcb');
    document.documentElement.style.setProperty('--button-background-color', '#ffffe3');
    document.documentElement.style.setProperty('--button-highlight-color', 'black');
    document.documentElement.style.setProperty('--button-fill-color', '#4a4a4a');
    document.documentElement.style.setProperty('--button-active-color', '#6d8196');
    document.body.classList.add("light");
    localStorage.setItem('light', 'true')
}

const disableLightmode = () => {
    document.documentElement.style.setProperty('--bg-color', '#222831');
    document.documentElement.style.setProperty('--button-background-color', '#393E46');
    document.documentElement.style.setProperty('--button-highlight-color', '#DFD0B8');
    document.documentElement.style.setProperty('--button-fill-color', 'white');
    document.documentElement.style.setProperty('--button-active-color', 'purple');
    document.body.classList.remove("light");
    localStorage.setItem('light', 'false')
}

if(theme === 'true') enableLightmode()

themeSwitch.addEventListener("click", () => {
    theme = localStorage.getItem('light')
    theme !== "true" ? enableLightmode() : disableLightmode()

})