use crate::db;
use serde_json::{Value, json};

pub const ASSETS: [(&str, &str, i64); 3] = [
    ("DPC", "DaProd Coin", 9_681),
    ("NEON", "Neon Token", 3_872),
    ("CLAW", "Claw Token", 19_363),
];
pub const UNIT: i64 = 1000;

// Un prezzo unico per ogni ora UTC, deterministico anche dopo il riavvio.
// Nessuna quotazione reale, nessuna promessa di rendimento.
pub fn price(asset: &str, hour: i64) -> Option<i64> {
    let (index, (_, _, base)) = ASSETS.iter().enumerate().find(|(_, a)| a.0 == asset)?;
    let seed = (hour as u64).wrapping_add(index as u64 * 173);
    let mut x = seed
        .wrapping_mul(6364136223846793005)
        .wrapping_add(1442695040888963407);
    x ^= x >> 33;
    let noise = (x % 1001) as i64 - 500;
    let wave = ((hour as f64 / (8.0 + index as f64) + index as f64).sin() * 1500.0) as i64;
    Some(base * (10000 + noise + wave) / 10000)
}
pub fn market() -> Value {
    let hour = db::now() / 3600;
    json!(ASSETS.iter().map(|(id,name,_)| json!({"id":id,"name":name,"price":price(id,hour),"unit":UNIT,
        "change": (price(id,hour).unwrap() as f64 / price(id,hour-24).unwrap() as f64 - 1.0)*100.0,
        "history":(0..48).rev().map(|h|json!({"time":(hour-h)*3600,"value":price(id,hour-h)})).collect::<Vec<_>>()
    })).collect::<Vec<_>>())
}
pub fn trade_value(asset: &str, units: i64, side: &str) -> Result<(i64, i64), String> {
    if !(1..=1_000_000_000).contains(&units) {
        return Err("Quantità non valida (massimo un milione di token)".into());
    }
    let p = price(asset, db::now() / 3600).ok_or("Moneta sconosciuta")?;
    let total = if side == "buy" {
        (p * units + UNIT - 1) / UNIT
    } else if side == "sell" {
        p * units / UNIT
    } else {
        return Err("Operazione sconosciuta".into());
    };
    if total < 1 {
        return Err("Quantità troppo piccola".into());
    }
    let fee = (total + 99) / 100;
    Ok((total, fee))
}

pub fn estimate(game: &str, raw: f64, invested: i64, finished: bool) -> Result<Value, String> {
    if !raw.is_finite() || !(0.0..=1e40).contains(&raw) {
        return Err("Punteggio non valido".into());
    }
    let scale = match game {
        "dozer" => None,
        "claw" => Some((6.0, 11.0)),
        "neon" => Some((6.0, 30.0)),
        _ => return Err("Gioco sconosciuto".into()),
    };
    let progress = scale
        .map(|(lo, hi)| ((raw.max(1.0).log10() - lo) / (hi - lo)).clamp(0.0, 1.0))
        .unwrap_or(0.0);
    let gross = if scale.is_none() {
        raw.min(db::MAX as f64)
    } else {
        (invested as f64 * (0.5 + 2.5 * progress) + 58088.0 * progress)
            * if finished { 1.25 } else { 1.0 }
    };
    let gross = gross.floor().min(db::MAX as f64) as i64;
    let fee = gross / 10;
    Ok(
        json!({"netto":gross-fee,"valore":gross,"fetta":fee,"progresso":progress,"messo":invested,"resa":0.5+2.5*progress,"finendo":gross-fee,"finita":finished}),
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn reject_bad_score() {
        assert!(estimate("claw", f64::INFINITY, 0, false).is_err());
        assert!(estimate("dozer", -1.0, 0, false).is_err());
    }
    #[test]
    fn fees_prevent_roundtrip_profit() {
        for a in ASSETS {
            for u in [1, 15, 1000, 1234567] {
                if let Ok((buy, fee)) = trade_value(a.0, u, "buy") {
                    let (sell, sfee) = trade_value(a.0, u, "sell").unwrap();
                    assert!(sell - sfee < buy + fee);
                }
            }
        }
    }
    #[test]
    fn huge_clicker_is_not_wallet_balance() {
        let e = estimate("neon", 1e30, 10000, true).unwrap();
        assert!(e["netto"].as_i64().unwrap() < 200000);
    }
}
