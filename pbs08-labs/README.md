# PBS08 online labs

Interactive labs for **PBS08 Large-Scale Neuroimaging and Normative Modelling** (Michaelmas 2026, University of Cambridge), by Dr Marcella Montagnese. Open `index.html` to start.

Everything runs in the browser. There is no build step and no external library, nothing is sent anywhere, and the labs work offline once the files are on your computer (double-click `index.html`).

| Lab | Topic | Goes with |
|---|---|---|
| 1 | Sampling: why small studies mislead | Lecture 2, slide 5 |
| 2 | Scanner lab: shift, stretch and ComBat | Lecture 2, slides 12–16 |
| 3 | Scanner fingerprint: the same real brain on virtual scanners | Lecture 2, slides 11–16 |
| 4 | Same-average lab: find the hidden patients | Lecture 2, slides 22–23 |
| 5 | Centile reader: z-scores and centiles | Lecture 2, slides 26–27 and 33 |
| 6 | Brain Charts app: guided visit to the real lifespan charts | Lecture 2, slides 28–30 |
| 7 | Case conference: eight fictional cases on a real MRI template | Lecture 2, slides 22–23 and 31–34 |
| 8 | Flagging lab: thresholds, sensitivity and prevalence | Preview for Lecture 6 |

## What is real and what is simulated

* All numbers in Labs 1 to 5, 7 and 8 are simulated. They are chosen to make an idea clear and do not represent any study.
* Labs 3 and 7 draw on a real MRI template, the ICBM152 2009a nonlinear symmetric T1 average of 152 healthy young adults. The scanners, the tissue loss and the deviation maps drawn on it are simulated. The eight people in Lab 7 are fictional composites, not patients.
* Lab 6 only links to the real Brain Charts web app (brainchart.io), which is run by the Lifespan Brain Chart Consortium.

## Files

* `shared.css`, `shared.js`: styles and helper functions used by every lab.
* `brain.js`, `brain_data.js`: the small MRI engine used by Labs 3 and 7, and the cropped template (a base64 PNG mosaic).
* `lab1_…` to `lab8_…`: the labs. `index.html`: the landing page.

## Credits and third-party material

* Template: Fonov, V. S. et al. (2009), *NeuroImage* 47, S102; Fonov, V. S. et al. (2011), *NeuroImage* 54, 313–327. ICBM152 2009a, McConnell Brain Imaging Centre, Montreal Neurological Institute, McGill University. Copyright 1993–2004 Louis Collins. Permission to use, copy, modify and distribute is granted without fee, provided that the copyright notice appears in all copies; the notice is kept in `brain_data.js` and in each lab that uses the template. The cropped template and the distance map derived from it were prepared for these labs.
* Brain Charts: Bethlehem, R. A. I., Seidlitz, J., White, S. R. et al. (2022), Brain charts for the human lifespan, *Nature* 604, 525–533.
* Idea of the lineup protocol in Lab 7: Buja, A. et al. (2009), *Philosophical Transactions of the Royal Society A* 367, 4361–4383.
