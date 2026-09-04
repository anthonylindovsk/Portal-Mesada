function mostrarAba(nomeDaAba) {
  document.getElementById("pfazer").style.display = "none";
  document.getElementById("pconcluidas").style.display = "none";
  document.getElementById("pperdidas").style.display = "none";
  document.getElementById(nomeDaAba).style.display = "block";
}

mostrarAba("pfazer");
