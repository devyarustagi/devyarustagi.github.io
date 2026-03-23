const canvas = document.getElementById('paper');
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
/*add canvas resizing feature, store all canvas objects in an array*/
/*function cursor_to_cross() {
    document.body.classList.remove("textcursor");
    document.body.classList.toggle("crosshair");
}
function cursor_to_text() {
    document.body.classList.remove("crosshair");
    document.body.classList.toggle("textcursor");
}
const tools = document.getElementsByClassName('tools')
for (const tool of tools) {
    tool.addEventListener("click", cursor_to_cross);
}
const texttool = document.getElementById("text")
texttool.removeEventListener("click", cursor_to_cross);
texttool.addEventListener("click", cursor_to_text) */

let curr_tool = localStorage.getItem("curr_tool");
if (curr_tool === null) {
    localStorage.setItem("curr_tool", "selection");
    curr_tool = localStorage.getItem("curr_tool");
    canvas.classList.remove("crosshair", "textcursor");
    document.getElementById(curr_tool).classList.add("selected");
    console.log("first time");
}
console.log(curr_tool);
const tools = document.getElementsByClassName('tools');
for (const tool of tools) {
    tool.addEventListener("click", (event) => {
        document.getElementById(curr_tool).classList.remove("selected");
        console.log("${curr_tool} removed");
        localStorage.setItem("curr_tool", event.currentTarget.id);
        curr_tool = localStorage.getItem("curr_tool");
        document.getElementById(curr_tool).classList.add("selected");
        console.log("${selected} added to ${curr_tool}");
        canvas.classList.remove("crosshair", "textcursor");
        if (curr_tool === "text") {
            canvas.classList.add("textcursor");
        }
        else {
            canvas.classList.add("crosshair");
        }
    });
}

