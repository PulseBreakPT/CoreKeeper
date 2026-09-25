package pt.golobot.predictor;

import android.app.Activity;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.text.InputType;
import android.view.Gravity;
import android.view.View;
import android.view.Window;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import java.util.Locale;

public final class MainActivity extends Activity {
    private static final int BG = Color.rgb(8, 12, 18);
    private static final int CARD = Color.rgb(18, 25, 35);
    private static final int CARD_2 = Color.rgb(24, 33, 46);
    private static final int TEXT = Color.rgb(241, 246, 252);
    private static final int MUTED = Color.rgb(148, 163, 184);
    private static final int GREEN = Color.rgb(61, 226, 139);
    private static final int LINE = Color.rgb(43, 56, 73);

    private EditText homeTeam, awayTeam;
    private EditText homeGF, homeGA, awayGF, awayGA;
    private EditText homeXG, homeXGA, awayXG, awayXGA;
    private EditText homeSOT, awaySOT, homeForm, awayForm, homeAbs, awayAbs;
    private LinearLayout resultCard;
    private TextView resultTitle, resultScore, resultXg, resultBody, resultTop, resultQuality;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Window w = getWindow();
        w.setStatusBarColor(BG);
        w.setNavigationBarColor(BG);

        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setBackgroundColor(BG);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(dp(18), dp(18), dp(18), dp(28));
        scroll.addView(root, new ScrollView.LayoutParams(-1, -2));

        TextView brand = text("GOLOBOT", 30, GREEN, true);
        brand.setLetterSpacing(0.08f);
        root.addView(brand);
        TextView sub = text("Previsão estatística de futebol · offline", 14, MUTED, false);
        root.addView(sub, lpTop(-1, dp(2)));

        LinearLayout game = card();
        game.addView(section("JOGO"));
        homeTeam = input("Equipa da casa", false);
        awayTeam = input("Equipa visitante", false);
        game.addView(homeTeam, lpTop(-1, dp(10)));
        game.addView(awayTeam, lpTop(-1, dp(8)));
        root.addView(game, lpTop(-1, dp(18)));

        LinearLayout required = card();
        required.addView(section("DADOS ESSENCIAIS · MÉDIAS RECENTES"));
        required.addView(note("Usa, idealmente, os últimos 5–10 jogos. Estes quatro campos são obrigatórios."), lpTop(-1, dp(5)));
        required.addView(text("Casa", 13, MUTED, true), lpTop(-1, dp(12)));
        LinearLayout hr1 = row();
        homeGF = input("Golos marcados", true);
        homeGA = input("Golos sofridos", true);
        hr1.addView(homeGF, weighted());
        hr1.addView(homeGA, weightedLeft());
        required.addView(hr1, lpTop(-1, dp(7)));
        required.addView(text("Visitante", 13, MUTED, true), lpTop(-1, dp(12)));
        LinearLayout ar1 = row();
        awayGF = input("Golos marcados", true);
        awayGA = input("Golos sofridos", true);
        ar1.addView(awayGF, weighted());
        ar1.addView(awayGA, weightedLeft());
        required.addView(ar1, lpTop(-1, dp(7)));
        root.addView(required, lpTop(-1, dp(12)));

        LinearLayout advanced = card();
        advanced.addView(section("DADOS AVANÇADOS · OPCIONAL"));
        advanced.addView(note("Quanto mais dados reais preencheres, menos o modelo depende apenas dos golos passados."), lpTop(-1, dp(5)));

        advanced.addView(text("xG / xGA", 13, MUTED, true), lpTop(-1, dp(12)));
        LinearLayout x1 = row(); homeXG=input("Casa xG",true); homeXGA=input("Casa xGA",true); x1.addView(homeXG,weighted()); x1.addView(homeXGA,weightedLeft()); advanced.addView(x1,lpTop(-1,dp(7)));
        LinearLayout x2 = row(); awayXG=input("Fora xG",true); awayXGA=input("Fora xGA",true); x2.addView(awayXG,weighted()); x2.addView(awayXGA,weightedLeft()); advanced.addView(x2,lpTop(-1,dp(7)));

        advanced.addView(text("Remates à baliza · média", 13, MUTED, true), lpTop(-1, dp(12)));
        LinearLayout srow=row(); homeSOT=input("Casa",true); awaySOT=input("Fora",true); srow.addView(homeSOT,weighted()); srow.addView(awaySOT,weightedLeft()); advanced.addView(srow,lpTop(-1,dp(7)));

        advanced.addView(text("Forma · pontos nos últimos 5 jogos (0–15)", 13, MUTED, true), lpTop(-1, dp(12)));
        LinearLayout frow=row(); homeForm=input("Casa",true); awayForm=input("Fora",true); frow.addView(homeForm,weighted()); frow.addView(awayForm,weightedLeft()); advanced.addView(frow,lpTop(-1,dp(7)));

        advanced.addView(text("Ausências importantes", 13, MUTED, true), lpTop(-1, dp(12)));
        LinearLayout arow=row(); homeAbs=input("Casa",true); awayAbs=input("Fora",true); arow.addView(homeAbs,weighted()); arow.addView(awayAbs,weightedLeft()); advanced.addView(arow,lpTop(-1,dp(7)));
        root.addView(advanced, lpTop(-1, dp(12)));

        LinearLayout actions = row();
        Button demo = button("EXEMPLO", false);
        Button analyze = button("ANALISAR JOGO", true);
        actions.addView(demo, weighted());
        actions.addView(analyze, weightedLeft());
        root.addView(actions, lpTop(-1, dp(14)));

        resultCard = card();
        resultCard.setVisibility(View.GONE);
        resultCard.addView(section("PREVISÃO DO MODELO"));
        resultTitle = text("", 18, TEXT, true); resultTitle.setGravity(Gravity.CENTER);
        resultScore = text("", 48, GREEN, true); resultScore.setGravity(Gravity.CENTER);
        resultXg = text("", 13, MUTED, false); resultXg.setGravity(Gravity.CENTER);
        resultBody = text("", 16, TEXT, false); resultBody.setLineSpacing(0, 1.25f);
        resultTop = text("", 15, TEXT, false); resultTop.setLineSpacing(0, 1.2f);
        resultQuality = text("", 13, MUTED, false); resultQuality.setLineSpacing(0, 1.2f);
        resultCard.addView(resultTitle, lpTop(-1, dp(10)));
        resultCard.addView(resultScore, lpTop(-1, dp(2)));
        resultCard.addView(resultXg);
        resultCard.addView(resultBody, lpTop(-1, dp(18)));
        resultCard.addView(resultTop, lpTop(-1, dp(14)));
        resultCard.addView(resultQuality, lpTop(-1, dp(14)));
        root.addView(resultCard, lpTop(-1, dp(14)));

        root.addView(note("O GOLOBOT calcula probabilidades, não certezas. Futebol tem variância, expulsões, lesões, decisões de arbitragem e outros fatores que nenhum modelo consegue prever totalmente."), lpTop(-1, dp(14)));

        demo.setOnClickListener(v -> fillDemo());
        analyze.setOnClickListener(v -> analyze());
        setContentView(scroll);
    }

    private void fillDemo() {
        homeTeam.setText("Equipa A"); awayTeam.setText("Equipa B");
        homeGF.setText("1.8"); homeGA.setText("1.0"); awayGF.setText("1.3"); awayGA.setText("1.4");
        homeXG.setText("1.7"); homeXGA.setText("1.1"); awayXG.setText("1.2"); awayXGA.setText("1.5");
        homeSOT.setText("5.3"); awaySOT.setText("4.0"); homeForm.setText("10"); awayForm.setText("6"); homeAbs.setText("1"); awayAbs.setText("2");
    }

    private void analyze() {
        try {
            PredictionEngine.Inputs in = new PredictionEngine.Inputs();
            in.homeGF = required(homeGF); in.homeGA = required(homeGA); in.awayGF = required(awayGF); in.awayGA = required(awayGA);
            in.homeXG = optional(homeXG); in.homeXGA = optional(homeXGA); in.awayXG = optional(awayXG); in.awayXGA = optional(awayXGA);
            in.homeSOT = optional(homeSOT); in.awaySOT = optional(awaySOT); in.homeForm = optional(homeForm); in.awayForm = optional(awayForm);
            in.homeAbsences = optional(homeAbs); in.awayAbsences = optional(awayAbs);

            if (valid(in.homeForm) && (in.homeForm < 0 || in.homeForm > 15)) throw new IllegalArgumentException("A forma deve estar entre 0 e 15.");
            if (valid(in.awayForm) && (in.awayForm < 0 || in.awayForm > 15)) throw new IllegalArgumentException("A forma deve estar entre 0 e 15.");

            PredictionEngine.Result r = PredictionEngine.predict(in);
            String h = homeTeam.getText().toString().trim(); if (h.isEmpty()) h = "Casa";
            String a = awayTeam.getText().toString().trim(); if (a.isEmpty()) a = "Visitante";
            PredictionEngine.ScoreProb best = r.topScores.get(0);

            resultTitle.setText(h + "  vs  " + a);
            resultScore.setText(best.home + " - " + best.away);
            resultXg.setText(String.format(Locale.US, "xG ajustado  %.2f  ·  %.2f", r.homeXG, r.awayXG));
            resultBody.setText(
                "1 / X / 2     " + pct(r.homeWin) + "  ·  " + pct(r.draw) + "  ·  " + pct(r.awayWin) + "\n" +
                "+1.5 golos     " + pct(r.over15) + "\n" +
                "+2.5 golos     " + pct(r.over25) + "\n" +
                "+3.5 golos     " + pct(r.over35) + "\n" +
                "Ambas marcam     " + pct(r.btts) + "\n" +
                h + " marca     " + pct(r.homeScores) + "   |   2+ golos  " + pct(r.homeOver15) + "\n" +
                a + " marca     " + pct(r.awayScores) + "   |   2+ golos  " + pct(r.awayOver15) + "\n" +
                "Total 0–1 / 2–3 / 4+     " + pct(r.total01) + "  ·  " + pct(r.total23) + "  ·  " + pct(r.total4plus)
            );

            StringBuilder top = new StringBuilder("Resultados exatos mais prováveis\n");
            for (int k = 0; k < r.topScores.size(); k++) {
                PredictionEngine.ScoreProb sp = r.topScores.get(k);
                if (k > 0) top.append("\n");
                top.append(k + 1).append(".  ").append(sp.home).append("-").append(sp.away).append("     ").append(pct(sp.probability));
            }
            resultTop.setText(top.toString());
            resultQuality.setText(
                "Qualidade dos dados: " + r.dataQuality + "/100\n" +
                "Força do sinal: " + r.modelSignal + "/100\n" +
                "A força do sinal mede quão concentradas estão as probabilidades; não é uma taxa de acerto garantida."
            );
            resultCard.setVisibility(View.VISIBLE);
            resultCard.requestFocus();
        } catch (IllegalArgumentException ex) {
            String msg = ex.getMessage();
            if (msg == null || msg.contains("Invalid required")) msg = "Preenche corretamente as quatro médias obrigatórias.";
            Toast.makeText(this, msg, Toast.LENGTH_LONG).show();
        } catch (Exception ex) {
            Toast.makeText(this, "Não foi possível calcular esta previsão.", Toast.LENGTH_LONG).show();
        }
    }

    private double required(EditText e) {
        double x = parse(e, false);
        if (!valid(x) || x < 0 || x > 10) throw new IllegalArgumentException("Invalid required metric");
        return x;
    }
    private double optional(EditText e) { return parse(e, true); }
    private double parse(EditText e, boolean allowEmpty) {
        String s = e.getText().toString().trim().replace(',', '.');
        if (s.isEmpty()) return Double.NaN;
        try { return Double.parseDouble(s); } catch (Exception ex) { throw new IllegalArgumentException("Há um valor numérico inválido."); }
    }
    private boolean valid(double x) { return !Double.isNaN(x) && !Double.isInfinite(x); }
    private String pct(double p) { return Math.round(p * 100.0) + "%"; }

    private LinearLayout card() {
        LinearLayout x = new LinearLayout(this); x.setOrientation(LinearLayout.VERTICAL); x.setPadding(dp(14), dp(14), dp(14), dp(14));
        GradientDrawable d = new GradientDrawable(); d.setColor(CARD); d.setCornerRadius(dp(18)); d.setStroke(dp(1), LINE); x.setBackground(d); return x;
    }
    private LinearLayout row() { LinearLayout r = new LinearLayout(this); r.setOrientation(LinearLayout.HORIZONTAL); return r; }
    private TextView section(String s) { TextView t=text(s,13,TEXT,true); t.setLetterSpacing(0.04f); return t; }
    private TextView note(String s) { TextView t=text(s,12,MUTED,false); t.setLineSpacing(0,1.15f); return t; }
    private TextView text(String s, int sp, int color, boolean bold) {
        TextView t = new TextView(this); t.setText(s); t.setTextSize(sp); t.setTextColor(color); if (bold) t.setTypeface(Typeface.DEFAULT, Typeface.BOLD); return t;
    }
    private EditText input(String hint, boolean numeric) {
        EditText e = new EditText(this); e.setHint(hint); e.setHintTextColor(MUTED); e.setTextColor(TEXT); e.setTextSize(14); e.setSingleLine(true); e.setPadding(dp(12),0,dp(12),0);
        if (numeric) e.setInputType(InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_FLAG_DECIMAL); else e.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_CAP_WORDS);
        GradientDrawable d = new GradientDrawable(); d.setColor(CARD_2); d.setCornerRadius(dp(12)); d.setStroke(dp(1), LINE); e.setBackground(d);
        e.setMinHeight(dp(52)); return e;
    }
    private Button button(String label, boolean primary) {
        Button b = new Button(this); b.setText(label); b.setTextSize(13); b.setTypeface(Typeface.DEFAULT, Typeface.BOLD); b.setAllCaps(false); b.setMinHeight(dp(56)); b.setTextColor(primary ? Color.rgb(4,25,14) : TEXT);
        GradientDrawable d=new GradientDrawable(); d.setColor(primary ? GREEN : CARD_2); d.setCornerRadius(dp(14)); d.setStroke(dp(1), primary ? GREEN : LINE); b.setBackground(d); return b;
    }
    private LinearLayout.LayoutParams lpTop(int width, int top) { LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(width,-2); p.topMargin=top; return p; }
    private LinearLayout.LayoutParams weighted() { LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(0,dp(52),1f); p.rightMargin=dp(4); return p; }
    private LinearLayout.LayoutParams weightedLeft() { LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(0,dp(52),1f); p.leftMargin=dp(4); return p; }
    private int dp(int n) { return Math.round(n * getResources().getDisplayMetrics().density); }
}
