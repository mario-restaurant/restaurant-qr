console.log("Supabase je pripojené:", supabaseClient);

let kosik = [];
let mojeObjednavkaId = null;


// ==============================
// ČÍSLO STOLA Z QR KÓDU
// ==============================

const urlParametre = new URLSearchParams(window.location.search);
const cisloStola = urlParametre.get("stol") || 7;

console.log("Číslo stola:", cisloStola);


// ==============================
// NAČÍTANIE MENU Z SUPABASE
// ==============================

async function nacitajMenu() {

    console.log("Načítavam menu...");

    const { data, error } = await supabaseClient
        .from("products")
        .select("*")
        .order("id");

    console.log("MENU DATA:", data);
    console.log("MENU ERROR:", error);

    const menuElement = document.getElementById("menu");

    if (error) {

        console.error("Chyba pri načítaní menu:", error);

        menuElement.innerHTML =
            "❌ Nepodarilo sa načítať menu.";

        return;
    }

    if (!data || data.length === 0) {

        menuElement.innerHTML =
            "Menu je momentálne prázdne.";

        return;
    }

    let html = "";

    data.forEach(function(product) {

        html += `
            <div>
                <h3>${product.name}</h3>

                <p>${product.description || ""}</p>

                <strong>
                    ${Number(product.price).toFixed(2)} €
                </strong>

                <br><br>

                <button
                    onclick="pridajDoKosika(${product.id})">
                    Pridať
                </button>

                <hr>
            </div>
        `;

    });

    menuElement.innerHTML = html;
}


// ==============================
// PRIDAŤ PRODUKT DO KOŠÍKA
// ==============================

async function pridajDoKosika(productId) {

    const { data, error } = await supabaseClient
        .from("products")
        .select("*")
        .eq("id", productId)
        .single();

    if (error) {

        console.error(
            "Chyba pri načítaní produktu:",
            error
        );

        return;
    }

    let existujucaPolozka =
        kosik.find(function(polozka) {

            return polozka.id === data.id;

        });


    if (existujucaPolozka) {

        existujucaPolozka.mnozstvo++;

    } else {

        kosik.push({

            id: data.id,

            nazov: data.name,

            cena: Number(data.price),

            mnozstvo: 1

        });

    }

    zobrazKosik();
}


// ==============================
// ZMENA MNOŽSTVA
// ==============================

function zmenMnozstvo(nazov, zmena) {

    let polozka =
        kosik.find(function(polozka) {

            return polozka.nazov === nazov;

        });


    if (!polozka) {
        return;
    }


    polozka.mnozstvo += zmena;


    if (polozka.mnozstvo <= 0) {

        kosik =
            kosik.filter(function(polozka) {

                return polozka.nazov !== nazov;

            });

    }


    zobrazKosik();
}


// ==============================
// ZOBRAZENIE KOŠÍKA
// ==============================

function zobrazKosik() {

    let kosikElement =
        document.getElementById("kosik");


    let html =
        "<h2>🛒 Tvoja objednávka</h2>";


    let spolu = 0;


    if (kosik.length === 0) {

        html +=
            "<p>Košík je zatiaľ prázdny.</p>";

    }


    kosik.forEach(function(polozka) {

        let cenaSpolu =
            polozka.cena * polozka.mnozstvo;


        spolu += cenaSpolu;


        html += `
            <div>

                <strong>
                    ${polozka.nazov}
                </strong>

                <br>

                ${cenaSpolu.toFixed(2)} €

                <br>

                <button
                    onclick="zmenMnozstvo('${polozka.nazov}', -1)">
                    −
                </button>

                ${polozka.mnozstvo}

                <button
                    onclick="zmenMnozstvo('${polozka.nazov}', 1)">
                    +
                </button>

            </div>

            <br>
        `;

    });


    html +=
        "<h3>Spolu: " +
        spolu.toFixed(2) +
        " €</h3>";


    html +=
        '<button onclick="odosliObjednavku()">OBJEDNAŤ</button>';


    kosikElement.innerHTML =
        html;
}


// ==============================
// ODOSLANIE OBJEDNÁVKY
// ==============================

async function odosliObjednavku() {

    if (kosik.length === 0) {

        alert("Košík je prázdny.");

        return;
    }


    let spolu = 0;


    kosik.forEach(function(polozka) {

        spolu +=
            polozka.cena *
            polozka.mnozstvo;

    });


    const {
        data: objednavka,
        error: chybaObjednavky
    } = await supabaseClient

        .from("orders")

        .insert([{

            table_number:
                Number(cisloStola),

            status:
                "new",

            total_price:
                spolu

        }])

        .select()

        .single();


    if (chybaObjednavky) {

        console.error(
            "Chyba objednávky:",
            chybaObjednavky
        );

        alert(
            "Objednávku sa nepodarilo odoslať."
        );

        return;
    }


    let orderId =
        objednavka.id;


    mojeObjednavkaId =
        orderId;


    zobrazStavObjednavky(
        objednavka.status
    );


    let polozkyObjednavky =
        kosik.map(function(polozka) {

            return {

                order_id:
                    orderId,

                product_name:
                    polozka.nazov,

                quantity:
                    polozka.mnozstvo,

                price:
                    polozka.cena

            };

        });


    const {
        error: chybaPoloziek
    } = await supabaseClient

        .from("order_items")

        .insert(
            polozkyObjednavky
        );


    if (chybaPoloziek) {

        console.error(
            "Chyba položiek:",
            chybaPoloziek
        );

        alert(
            "Objednávka bola vytvorená, ale nepodarilo sa uložiť jej položky."
        );

        return;
    }


    alert(
        "Objednávka bola odoslaná! 🍕"
    );


    kosik = [];


    zobrazKosik();
}


// ==============================
// ZAVOLAŤ OBSLUHU
// ==============================

async function zavolajObsluhu() {

    const { error } =
        await supabaseClient

            .from("waiter_calls")

            .insert([{

                table_number:
                    Number(cisloStola),

                status:
                    "new"

            }]);


    if (error) {

        console.error(
            "Chyba:",
            error
        );

        alert(
            "❌ Nepodarilo sa zavolať obsluhu."
        );

        return;
    }


    alert(
        "🔔 Obsluha bola zavolaná!"
    );
}


// ==============================
// ZOBRAZENIE STAVU OBJEDNÁVKY
// ==============================

function zobrazStavObjednavky(status) {

    let element =
        document.getElementById(
            "stavObjednavky"
        );


    if (status === "new") {

        element.innerHTML = `
            <h2>
                📋 Objednávka #${mojeObjednavkaId}
            </h2>

            <p>
                🟡 Objednávka bola odoslaná.
            </p>
        `;

    }


    if (status === "accepted") {

        element.innerHTML = `
            <h2>
                📋 Objednávka #${mojeObjednavkaId}
            </h2>

            <p>
                🟢 Obsluha prijala tvoju objednávku.
            </p>
        `;

    }


    if (status === "preparing") {

        element.innerHTML = `
            <h2>
                📋 Objednávka #${mojeObjednavkaId}
            </h2>

            <p>
                👨‍🍳 Objednávka sa pripravuje.
            </p>
        `;

    }


    if (status === "ready") {

        element.innerHTML = `
            <h2>
                📋 Objednávka #${mojeObjednavkaId}
            </h2>

            <p>
                🍽️ Objednávka je hotová!
            </p>
        `;

    }
}


// ==============================
// KONTROLA STAVU OBJEDNÁVKY
// ==============================

async function kontrolujStavObjednavky() {

    if (mojeObjednavkaId === null) {
        return;
    }


    const {
        data,
        error
    } = await supabaseClient

        .from("orders")

        .select("status")

        .eq(
            "id",
            mojeObjednavkaId
        )

        .single();


    if (error) {

        console.error(
            "Chyba pri kontrole stavu:",
            error
        );

        return;
    }


    zobrazStavObjednavky(
        data.status
    );
}


// ==============================
// SPUSTENIE
// ==============================

nacitajMenu();


setInterval(
    kontrolujStavObjednavky,
    2000
);