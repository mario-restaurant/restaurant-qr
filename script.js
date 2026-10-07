console.log("Supabase je pripojené:", supabaseClient);
let kosik = [];
const urlParametre = new URLSearchParams(window.location.search);
const cisloStola = urlParametre.get("stol") || 7;

console.log("Číslo stola:", cisloStola);

function pridajDoKosika(nazov, cena) {
    let existujucaPolozka = kosik.find(function(polozka) {
        return polozka.nazov === nazov;
    });

    if (existujucaPolozka) {
        existujucaPolozka.mnozstvo++;
    } else {
        kosik.push({
            nazov: nazov,
            cena: cena,
            mnozstvo: 1
        });
    }

    zobrazKosik();
}

function zmenMnozstvo(nazov, zmena) {
    let polozka = kosik.find(function(polozka) {
        return polozka.nazov === nazov;
    });

    polozka.mnozstvo += zmena;

    if (polozka.mnozstvo <= 0) {
        kosik = kosik.filter(function(polozka) {
            return polozka.nazov !== nazov;
        });
    }

    zobrazKosik();
}

function zobrazKosik() {
    let kosikElement = document.getElementById("kosik");

    let html = "<h2>🛒 Tvoja objednávka</h2>";
    let spolu = 0;

    if (kosik.length === 0) {
        html += "<p>Košík je zatiaľ prázdny.</p>";
    }

    kosik.forEach(function(polozka) {
        let cenaSpolu = polozka.cena * polozka.mnozstvo;
        spolu += cenaSpolu;

        html += `
            <div>
                <strong>${polozka.nazov}</strong>
                <br>
                ${cenaSpolu.toFixed(2)} €
                <br>
                <button onclick="zmenMnozstvo('${polozka.nazov}', -1)">−</button>
                ${polozka.mnozstvo}
                <button onclick="zmenMnozstvo('${polozka.nazov}', 1)">+</button>
            </div>
            <br>
        `;
    });

    html += "<h3>Spolu: " + spolu.toFixed(2) + " €</h3>";
    html += '<button onclick="odosliObjednavku()">OBJEDNAŤ</button>';

    kosikElement.innerHTML = html;
}
async function odosliObjednavku() {
    if (kosik.length === 0) {
        alert("Košík je prázdny.");
        return;
    }

    let spolu = 0;

    kosik.forEach(function(polozka) {
        spolu += polozka.cena * polozka.mnozstvo;
    });

    // 1. Vytvoríme hlavnú objednávku
    const { data: objednavka, error: chybaObjednavky } = await supabaseClient
        .from("orders")
        .insert([
            {
                table_number: Number(cisloStola),
                status: "new",
                total_price: spolu
            }
        ])
        .select()
        .single();

    if (chybaObjednavky) {
        console.error("Chyba objednávky:", chybaObjednavky);
        alert("Objednávku sa nepodarilo odoslať.");
        return;
    }

    // 2. Zoberieme ID vytvorenej objednávky
    let orderId = objednavka.id;

    console.log("Vytvorená objednávka:", orderId);

    // 3. Pripravíme jednotlivé položky
    let polozkyObjednavky = kosik.map(function(polozka) {
        return {
            order_id: orderId,
            product_name: polozka.nazov,
            quantity: polozka.mnozstvo,
            price: polozka.cena
        };
    });

    // 4. Uložíme položky do order_items
    const { error: chybaPoloziek } = await supabaseClient
        .from("order_items")
        .insert(polozkyObjednavky);

    if (chybaPoloziek) {
        console.error("Chyba položiek:", chybaPoloziek);
        alert("Objednávka bola vytvorená, ale nepodarilo sa uložiť jej položky.");
        return;
    }

    console.log("Položky objednávky uložené:", polozkyObjednavky);

    alert("Objednávka bola odoslaná! 🍕");

    kosik = [];

    zobrazKosik();
}
async function zavolajObsluhu() {

    const { error } = await supabaseClient
        .from("waiter_calls")
        .insert([
            {
                table_number: Number(cisloStola),
                status: "new"
            }
        ]);

    if (error) {
        console.error("Chyba:", error);
        alert("❌ Nepodarilo sa zavolať obsluhu.");
        return;
    }

    alert("🔔 Obsluha bola zavolaná!");
}