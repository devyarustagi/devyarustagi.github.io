const canvas = document.getElementById('paper');
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
/*add canvas resizing feature, store all canvas objects in an array*/

let curr_tool = localStorage.getItem("curr_tool");
if (curr_tool === "") {
    localStorage.setItem("curr_tool", "selection");
    curr_tool = localStorage.getItem("curr_tool");
    canvas.classList.remove("crosshair", "textcursor");
}

//function to change the cursor
function change_cursor(){
    canvas.classList.remove("crosshair", "textcursor");
    if (curr_tool === "text") {
            canvas.classList.add("textcursor");
        }
    else if (curr_tool !== "selection") {
            canvas.classList.add("crosshair");
        }
}

document.getElementById(curr_tool).classList.add("selected");
change_cursor();
        
const tools = document.getElementsByClassName('tools');
for (const tool of tools) {
    tool.addEventListener("click", (event) => {
        document.getElementById(curr_tool).classList.remove("selected");
        console.log(`class selected removed from ${curr_tool}.`);
        localStorage.setItem("curr_tool", event.currentTarget.id);
        curr_tool = localStorage.getItem("curr_tool");
        document.getElementById(curr_tool).classList.add("selected");
        console.log(`class selected added to ${curr_tool}`);
        change_cursor();
    });
}

