let theme = localStorage.getItem('light')
const themeSwitch = document.getElementById('toggle_theme')
if(!localStorage.getItem("canvas_color")){
    localStorage.setItem("canvas_color","#222831")
}
document.documentElement.style.setProperty('--bg-color', `${localStorage.getItem("canvas_color")}`);
document.getElementById("canvas_color").value = localStorage.getItem("canvas_color");
document.getElementById("canvas_color").addEventListener("change",(e)=>{
    localStorage.setItem("canvas_color",`${e.currentTarget.value}`)
    document.documentElement.style.setProperty('--bg-color', `${e.currentTarget.value}`);
})
const enableLightmode = () =>{
    document.documentElement.style.setProperty('--button-background-color', '#ffffe3');
    document.documentElement.style.setProperty('--button-highlight-color', 'black');
    document.documentElement.style.setProperty('--button-fill-color', '#4a4a4a');
    document.documentElement.style.setProperty('--button-active-color', '#6d8196');
    document.body.classList.add("light");
    localStorage.setItem('light', 'true')
}

const disableLightmode = () => {
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