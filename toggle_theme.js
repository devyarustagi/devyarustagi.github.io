let theme = localStorage.getItem('light')
const themeSwitch = document.getElementById('toggle_theme')

const enableLightmode = () => {
    document.body.classList.add('light')
    localStorage.setItem('light', 'true')
}

const disableLightmode = () => {
    document.body.classList.remove('light')
    localStorage.setItem('light', 'false')
}

if(theme === 'true') enableLightmode()

themeSwitch.addEventListener("click", () => {
    theme = localStorage.getItem('light')
    theme !== "true" ? enableLightmode() : disableLightmode()

})