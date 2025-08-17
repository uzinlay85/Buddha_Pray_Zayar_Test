// DOM Elements
const seatingChartContainer = document.getElementById("seating-chart-container");
const absentList = document.getElementById("absent-list");
const onLeaveList = document.getElementById("on-leave-list");
const resetButton = document.getElementById("reset-button");
const copyAbsentButton = document.getElementById("copy-absent-button");
const copyLeaveButton = document.getElementById("copy-leave-button");
const tooltip = document.getElementById("seat-tooltip");
const currentDateAbsentEl = document.getElementById("current-date-absent");
const currentDateLeaveEl = document.getElementById("current-date-leave");
const pdfExportBtn = document.getElementById("pdf-export");
const excelExportBtn = document.getElementById("excel-export");

// Constants
const ROWS = 15;
const SEATS_PER_ROW = 16;

// Example student data
const studentData = {
  "2-1":"ဦးဇာနိက\n(လှ)","2-2":"ဦးဝိမလာစာ\n(လှ)",
  "2-3":"ဦးကုမာရ\n(လှ)","2-4":"ဦးဝိဝေကာနန္ဒာ(လှ)"
  // ...နေရာကုန်ထည့်ပါ။
};
const dormColors = {
  "လှ":"bg-sky-100 text-sky-800 border-sky-200",
  "သိမ်":"bg-teal-100 text-teal-800 border-teal-200",
  default:"bg-gray-200 text-gray-800 border-gray-300"
};

document.addEventListener("DOMContentLoaded",()=>{
  createSeatingChart();
  loadAttendanceFromLocal();
  updateLists();
  const today=getBurmeseDate();
  currentDateAbsentEl.textContent = today;
  currentDateLeaveEl.textContent = today;
});

// Seating Chart Build
function createSeatingChart(){
  seatingChartContainer.innerHTML = "";
  for(let row=2;row<=ROWS;row++){
    const box=document.createElement("div");
    box.innerHTML = `<div class="font-bold text-gray-700 mb-2">အတန်း - ${row}</div>`;
    const grid=document.createElement("div");
    grid.className = "grid-container";
    for(let seat=1;seat<=SEATS_PER_ROW;seat++){
      const key = `${row}-${seat}`;
      const name = studentData[key] || '';
      const div=document.createElement("div");
      div.className = "seat h-24 flex flex-col items-center justify-center rounded-md p-1 border transition-all text-center";
      div.dataset.row = row; div.dataset.seat = seat;
      if(name){
        const displayName = name.split("\n")[0];
        const dormMatch = name.match(/\((.*?)\)/);
        const dorm=dormMatch?dormMatch[1]:null;
        div.innerHTML = `<span class="font-bold text-sm">${seat}</span>
                         <span class="text-[10px] mt-1">${displayName}</span>
                         <span class="text-[9px] text-gray-500">${dorm ? `(${dorm})`:""}</span>`;
        const colorCls = (dormColors[dorm]||dormColors.default).split(" ");
        div.classList.add(...colorCls,"cursor-pointer","hover:scale-110");
        div.dataset.name = name.replace(/\n/g," ");
        div.addEventListener("click",cycleAttendanceState);
        div.addEventListener("mouseover",showTooltip);
        div.addEventListener("mouseout",hideTooltip);
        div.addEventListener("mousemove",moveTooltip);
      }else{
        div.classList.add("empty");
        div.innerHTML = `<span class="font-bold text-sm">${seat}</span>`;
      }
      grid.appendChild(div);
    }
    box.appendChild(grid);
    seatingChartContainer.appendChild(box);
  }
}

// Attendance cycle logic + localStorage save
function cycleAttendanceState(e){
  const seat = e.currentTarget;
  if(seat.classList.contains("absent")){
    seat.classList.remove("absent");
    seat.classList.add("on-leave");
  }else if(seat.classList.contains("on-leave")){
    seat.classList.remove("on-leave");
  }else{
    seat.classList.add("absent");
  }
  updateLists();
  saveAttendanceToLocal();
}

// Attendance List UI
function updateLists(){
  updateList("absent",absentList,copyAbsentButton,"ပျက်ကွက်သူ မရှိပါ။");
  updateList("on-leave",onLeaveList,copyLeaveButton,"ခွင့်ရှိသူ မရှိပါ။");
}

function updateList(state,ul,btn,emptyMsg){
  ul.innerHTML="";
  const seats = document.querySelectorAll(`.seat.${state}`);
  if(!seats.length){
    ul.innerHTML = `<li class="text-gray-500">${emptyMsg}</li>`;
    btn.disabled=true; btn.classList.add("opacity-50");
  }else{
    btn.disabled=false; btn.classList.remove("opacity-50");
    [...seats].sort(sortSeats).forEach(seat=>{
      const li=document.createElement("li");
      li.className=`p-2 rounded ${state==="absent"?"bg-red-50 text-red-800":"bg-yellow-50 text-yellow-800"}`;
      li.textContent=`အတန်း ${seat.dataset.row}၊ ခုံ ${seat.dataset.seat}: ${seat.dataset.name}`;
      ul.appendChild(li);
    });
  }
}
function sortSeats(a,b){
  const ra=+a.dataset.row, rb=+b.dataset.row;
  const sa=+a.dataset.seat,sb=+b.dataset.seat;
  return ra===rb?sa-sb:ra-rb;
}

// Tooltip logic
function showTooltip(e){ tooltip.textContent=e.currentTarget.dataset.name; tooltip.classList.remove("hidden"); }
function hideTooltip(){ tooltip.classList.add("hidden"); }
function moveTooltip(e){ tooltip.style.left=e.pageX+15+"px"; tooltip.style.top=e.pageY+15+"px"; }

// Burmese date
function getBurmeseDate(){
  const m=["ဇန်န","ဖေ","မတ်","ဧ","မေ","ဇွန်","ဇူ","ဩ","စက်","အောက်","နို","ဒီ"];
  const num=["၀","၁","၂","၃","၄","၅","၆","၇","၈","၉"];
  const toBM=n=>String(n).split("").map(d=>num[d]).join("");
  const d=new Date();
  return `${m[d.getMonth()]} ${toBM(d.getDate())} ရက်၊ ${toBM(d.getFullYear())}`;
}

// Reset
resetButton.addEventListener("click",()=>{
  document.querySelectorAll(".seat").forEach(s=>s.classList.remove("absent","on-leave"));
  saveAttendanceToLocal();
  updateLists();
});

// Copy list
copyAbsentButton.addEventListener("click",()=>copyList("absent"));
copyLeaveButton.addEventListener("click",()=>copyList("on-leave"));
function copyList(state){
  const ul = state==="absent"?absentList:onLeaveList;
  const items=ul.querySelectorAll("li:not(.text-gray-500)");
  if(!items.length)return;
  let txt=`${state==="absent"?"ပျက်ကွက်စာရင်း":"ခွင့်စာရင်း"} (${getBurmeseDate()}):\n\n`;
  items.forEach(li=>txt+=li.textContent+"\n");
  navigator.clipboard.writeText(txt.trim());
}

// === localStorage functions ===
function saveAttendanceToLocal(){
  const status=[];
  document.querySelectorAll(".seat").forEach(seat=>{
    if(seat.dataset.row && seat.dataset.seat)
      status.push({
        row: seat.dataset.row,
        seat: seat.dataset.seat,
        absent: seat.classList.contains("absent"),
        onLeave: seat.classList.contains("on-leave")
      });
  });
  localStorage.setItem("attendanceStatus",JSON.stringify(status));
}
function loadAttendanceFromLocal(){
  const data = localStorage.getItem("attendanceStatus");
  if(!data) return;
  const status = JSON.parse(data);
  status.forEach(s=>{
    const selector = `.seat[data-row="${s.row}"][data-seat="${s.seat}"]`;
    const seat = document.querySelector(selector);
    if(seat){
      seat.classList.remove("absent","on-leave");
      if(s.absent) seat.classList.add("absent");
      else if(s.onLeave) seat.classList.add("on-leave");
    }
  });
}

// === Export Excel (CSV) ===
excelExportBtn.addEventListener("click",()=>{
  let csv = "Row,Seat,Name,Status\n";
  document.querySelectorAll(".seat").forEach(seat=>{
    if(seat.dataset.name){
      let status="Attend";
      if(seat.classList.contains("absent")) status="Absent";
      else if(seat.classList.contains("on-leave")) status="Leave";
      csv+=`${seat.dataset.row},${seat.dataset.seat},"${seat.dataset.name}",${status}\n`;
    }
  });
  const blob=new Blob([csv],{type:"text/csv"});
  const url=URL.createObjectURL(blob);
  const link=document.createElement("a");
  link.href=url; link.download="attendance.csv";
  link.click();
});

// === Export PDF (jsPDF required) ===
pdfExportBtn.addEventListener("click",()=>{
  const doc = new window.jspdf.jsPDF();
  let y = 10;
  doc.setFont("Pyidaungsu");
  doc.text("ပျက်ကွက်စာရင်း",10,y); y+=10;
  let i=1;
  absentList.querySelectorAll("li:not(.text-gray-500)").forEach(li=>{
    doc.text(`${i++}. ${li.textContent}`,12,y);
    y+=10;
  });
  y+=10; i=1;
  doc.text("ခွင့်ရှိသူစာရင်း",10,y); y+=10;
  onLeaveList.querySelectorAll("li:not(.text-gray-500)").forEach(li=>{
    doc.text(`${i++}. ${li.textContent}`,12,y);
    y+=10;
  });
  doc.save("attendance.pdf");
});
