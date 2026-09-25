package pt.golobot.predictor;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

public final class PredictionEngine {
    public static final double MISSING = Double.NaN;

    public static final class Inputs {
        public double homeGF, homeGA, awayGF, awayGA;
        public double homeXG = MISSING, homeXGA = MISSING, awayXG = MISSING, awayXGA = MISSING;
        public double homeSOT = MISSING, awaySOT = MISSING;
        public double homeForm = MISSING, awayForm = MISSING;
        public double homeAbsences = MISSING, awayAbsences = MISSING;
    }

    public static final class ScoreProb {
        public final int home, away;
        public final double probability;
        public ScoreProb(int home, int away, double probability) {
            this.home = home; this.away = away; this.probability = probability;
        }
    }

    public static final class Result {
        public double homeXG, awayXG;
        public double homeWin, draw, awayWin;
        public double over15, over25, over35, btts;
        public double homeScores, awayScores;
        public double homeOver15, awayOver15;
        public double total01, total23, total4plus;
        public int dataQuality, modelSignal;
        public List<ScoreProb> topScores = new ArrayList<>();
    }

    public static Result predict(Inputs in) {
        validateRequired(in);

        double goalHome = 0.58 * in.homeGF + 0.42 * in.awayGA;
        double goalAway = 0.58 * in.awayGF + 0.42 * in.homeGA;

        double lambdaH = goalHome;
        double lambdaA = goalAway;

        boolean completeXg = valid(in.homeXG) && valid(in.homeXGA) && valid(in.awayXG) && valid(in.awayXGA);
        if (completeXg) {
            double xgHome = 0.58 * in.homeXG + 0.42 * in.awayXGA;
            double xgAway = 0.58 * in.awayXG + 0.42 * in.homeXGA;
            lambdaH = 0.64 * goalHome + 0.36 * xgHome;
            lambdaA = 0.64 * goalAway + 0.36 * xgAway;
        }

        lambdaH = 0.90 * lambdaH + 0.10 * 1.40;
        lambdaA = 0.90 * lambdaA + 0.10 * 1.20;

        lambdaH *= 1.075;
        lambdaA *= 0.970;

        if (valid(in.homeSOT)) lambdaH *= clamp(0.90 + 0.025 * in.homeSOT, 0.90, 1.10);
        if (valid(in.awaySOT)) lambdaA *= clamp(0.90 + 0.025 * in.awaySOT, 0.90, 1.10);

        if (valid(in.homeForm)) lambdaH *= formModifier(in.homeForm);
        if (valid(in.awayForm)) lambdaA *= formModifier(in.awayForm);

        if (valid(in.homeAbsences)) {
            double n = clamp(in.homeAbsences, 0, 8);
            lambdaH *= 1.0 - 0.025 * n;
            lambdaA *= 1.0 + 0.012 * n;
        }
        if (valid(in.awayAbsences)) {
            double n = clamp(in.awayAbsences, 0, 8);
            lambdaA *= 1.0 - 0.025 * n;
            lambdaH *= 1.0 + 0.012 * n;
        }

        lambdaH = clamp(lambdaH, 0.12, 4.60);
        lambdaA = clamp(lambdaA, 0.12, 4.60);

        final int MAX = 10;
        double[][] p = new double[MAX + 1][MAX + 1];
        double rho = clamp(-0.10 + 0.018 * ((lambdaH + lambdaA) - 2.5), -0.12, -0.035);
        double sum = 0.0;
        for (int h = 0; h <= MAX; h++) {
            for (int a = 0; a <= MAX; a++) {
                double base = poisson(h, lambdaH) * poisson(a, lambdaA);
                double tau = dixonColesTau(h, a, lambdaH, lambdaA, rho);
                p[h][a] = Math.max(0.0, base * tau);
                sum += p[h][a];
            }
        }
        if (sum <= 0) throw new IllegalStateException("Probability matrix collapsed");
        for (int h = 0; h <= MAX; h++) for (int a = 0; a <= MAX; a++) p[h][a] /= sum;

        Result r = new Result();
        r.homeXG = lambdaH; r.awayXG = lambdaA;
        List<ScoreProb> all = new ArrayList<>();
        for (int h = 0; h <= MAX; h++) {
            for (int a = 0; a <= MAX; a++) {
                double q = p[h][a];
                all.add(new ScoreProb(h, a, q));
                if (h > a) r.homeWin += q; else if (h == a) r.draw += q; else r.awayWin += q;
                int total = h + a;
                if (total >= 2) r.over15 += q;
                if (total >= 3) r.over25 += q;
                if (total >= 4) r.over35 += q;
                if (h > 0 && a > 0) r.btts += q;
                if (h > 0) r.homeScores += q;
                if (a > 0) r.awayScores += q;
                if (h >= 2) r.homeOver15 += q;
                if (a >= 2) r.awayOver15 += q;
                if (total <= 1) r.total01 += q;
                else if (total <= 3) r.total23 += q;
                else r.total4plus += q;
            }
        }
        Collections.sort(all, new Comparator<ScoreProb>() {
            @Override public int compare(ScoreProb x, ScoreProb y) {
                return Double.compare(y.probability, x.probability);
            }
        });
        r.topScores = new ArrayList<>(all.subList(0, 5));

        int quality = 55;
        if (completeXg) quality += 20;
        if (valid(in.homeSOT) && valid(in.awaySOT)) quality += 8;
        if (valid(in.homeForm) && valid(in.awayForm)) quality += 10;
        if (valid(in.homeAbsences) && valid(in.awayAbsences)) quality += 7;
        r.dataQuality = (int) clamp(Math.round(quality), 55, 100);

        double maxOutcome = Math.max(r.homeWin, Math.max(r.draw, r.awayWin));
        double entropy = 0.0;
        double[] outs = {r.homeWin, r.draw, r.awayWin};
        for (double q : outs) if (q > 0) entropy -= q * Math.log(q);
        double normalizedEntropy = entropy / Math.log(3.0);
        double clarity = 1.0 - normalizedEntropy;
        r.modelSignal = (int) clamp(Math.round(35 + 45 * clarity + 18 * (maxOutcome - 1.0 / 3.0)), 35, 82);
        return r;
    }

    private static void validateRequired(Inputs in) {
        double[] req = {in.homeGF, in.homeGA, in.awayGF, in.awayGA};
        for (double x : req) if (!valid(x) || x < 0 || x > 10) throw new IllegalArgumentException("Invalid required metric");
    }

    private static boolean valid(double x) { return !Double.isNaN(x) && !Double.isInfinite(x); }
    private static double formModifier(double points) {
        points = clamp(points, 0, 15);
        return clamp(0.92 + (points / 15.0) * 0.16, 0.92, 1.08);
    }
    private static double dixonColesTau(int h, int a, double lh, double la, double rho) {
        if (h == 0 && a == 0) return 1.0 - lh * la * rho;
        if (h == 0 && a == 1) return 1.0 + lh * rho;
        if (h == 1 && a == 0) return 1.0 + la * rho;
        if (h == 1 && a == 1) return 1.0 - rho;
        return 1.0;
    }
    private static double poisson(int k, double lambda) {
        double fact = 1.0;
        for (int i = 2; i <= k; i++) fact *= i;
        return Math.exp(-lambda) * Math.pow(lambda, k) / fact;
    }
    private static double clamp(double x, double lo, double hi) { return Math.max(lo, Math.min(hi, x)); }
}
