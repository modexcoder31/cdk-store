document.addEventListener(
  "DOMContentLoaded",
  () => {


    /* =================================================
       HELPERS
    ================================================= */

    const $ =
      (selector) =>
        document.querySelector(
          selector
        );


    /* =================================================
       STATE
    ================================================= */

    let config = {

      paymentAddress:
        "0x362CF6C729eDD5e42FABeF53E0F3826fF944b218",

      pricePerCDK:
        1

    };


    let quantity =
      1;


    let currentOrder =
      null;


    /* =================================================
       ELEMENTS
    ================================================= */

    const quantityInput =
      $("#quantity");

    const decreaseQuantity =
      $("#decreaseQuantity");

    const increaseQuantity =
      $("#increaseQuantity");

    const totalAmount =
      $("#totalAmount");

    const createOrder =
      $("#createOrder");

    const paymentSection =
      $("#paymentSection");

    const paymentAddress =
      $("#paymentAddress");

    const paymentAmount =
      $("#paymentAmount");

    const copyAddress =
      $("#copyAddress");

    const orderId =
      $("#orderId");

    const orderStatus =
      $("#orderStatus");

    const orderMessage =
      $("#orderMessage");

    const paymentForm =
      $("#paymentForm");

    const txHash =
      $("#txHash");

    const submitPayment =
      $("#submitPayment");

    const refreshOrder =
      $("#refreshOrder");

    const codesContainer =
      $("#codesContainer");


    /* =================================================
       CDK PASTE ELEMENTS
    ================================================= */

    const cdkKeyInput =
      $("#cdkKeyInput");

    const pasteCdkButton =
      $("#pasteCdkButton");

    const useCdkButton =
      $("#useCdkButton");

    const cdkPasteMessage =
      $("#cdkPasteMessage");


    /* =================================================
       MOBILE MENU
    ================================================= */

    const mobileMenuButton =
      $("#mobileMenuButton");

    const mobileNav =
      $("#mobileNav");


    if (
      mobileMenuButton &&
      mobileNav
    ) {

      mobileMenuButton.addEventListener(
        "click",
        () => {

          const isHidden =
            mobileNav.hidden;

          mobileNav.hidden =
            !isHidden;

          mobileMenuButton.textContent =
            isHidden
              ? "×"
              : "☰";

        }
      );


      mobileNav
        .querySelectorAll("a")
        .forEach(
          (link) => {

            link.addEventListener(
              "click",
              () => {

                mobileNav.hidden =
                  true;

                mobileMenuButton.textContent =
                  "☰";

              }
            );

          }
        );

    }


    /* =================================================
       LOAD CONFIG
    ================================================= */

    async function loadConfig() {

      try {

        const response =
          await fetch(
            "/api/config"
          );


        const data =
          await response.json();


        if (
          !response.ok ||
          !data.success
        ) {

          throw new Error(
            "Unable to load store configuration."
          );

        }


        config =
          data;


        updateStoreUI();

      } catch (error) {

        console.error(
          "Configuration error:",
          error
        );


        showMessage(
          error.message,
          "error"
        );

      }

    }


    /* =================================================
       UPDATE STORE UI
    ================================================= */

    function updateStoreUI() {

      const total =
        quantity *
        Number(
          config.pricePerCDK
        );


      if (
        quantityInput
      ) {

        quantityInput.value =
          quantity;

      }


      if (
        totalAmount
      ) {

        totalAmount.textContent =
          `${total} USDT`;

      }


      if (
        paymentAddress
      ) {

        paymentAddress.textContent =
          config.paymentAddress;

      }

    }


    /* =================================================
       SET QUANTITY
    ================================================= */

    function setQuantity(
      value
    ) {

      let next =
        Number(
          value
        );


      if (
        !Number.isFinite(next)
      ) {

        next =
          1;

      }


      next =
        Math.floor(
          next
        );


      next =
        Math.max(
          1,
          Math.min(
            1000,
            next
          )
        );


      quantity =
        next;


      updateStoreUI();

    }


    /* =================================================
       QUANTITY BUTTONS
    ================================================= */

    if (
      decreaseQuantity
    ) {

      decreaseQuantity.addEventListener(
        "click",
        () => {

          setQuantity(
            quantity - 1
          );

        }
      );

    }


    if (
      increaseQuantity
    ) {

      increaseQuantity.addEventListener(
        "click",
        () => {

          setQuantity(
            quantity + 1
          );

        }
      );

    }


    if (
      quantityInput
    ) {

      quantityInput.addEventListener(
        "input",
        () => {

          setQuantity(
            quantityInput.value
          );

        }
      );


      quantityInput.addEventListener(
        "blur",
        () => {

          setQuantity(
            quantityInput.value
          );

        }
      );

    }


    /* =================================================
       COPY PAYMENT ADDRESS
    ================================================= */

    if (
      copyAddress
    ) {

      copyAddress.addEventListener(
        "click",
        async () => {

          try {

            await copyText(
              config.paymentAddress
            );


            const oldText =
              copyAddress.textContent;


            copyAddress.textContent =
              "Copied ✓";


            setTimeout(
              () => {

                copyAddress.textContent =
                  oldText;

              },
              1500
            );


          } catch (error) {

            showMessage(
              "Unable to copy the payment address.",
              "error"
            );

          }

        }
      );

    }


    /* =================================================
       CREATE ORDER
    ================================================= */

    if (
      createOrder
    ) {

      createOrder.addEventListener(
        "click",
        async () => {


          createOrder.disabled =
            true;


          createOrder.innerHTML =
            "Creating...";


          try {


            const response =
              await fetch(
                "/api/orders",
                {

                  method:
                    "POST",

                  headers: {

                    "Content-Type":
                      "application/json"

                  },

                  body:
                    JSON.stringify({

                      quantity:
                        quantity

                    })

                }
              );


            const data =
              await response.json();


            if (
              !response.ok ||
              !data.success
            ) {

              throw new Error(
                data.message ||
                "Unable to create order."
              );

            }


            currentOrder =
              data.order;


            showPaymentSection();


            showMessage(
              "Order created successfully.",
              "success"
            );


          } catch (error) {


            showMessage(
              error.message,
              "error"
            );


          } finally {


            createOrder.disabled =
              false;


            createOrder.innerHTML =
              `
                Create Order
                <span>→</span>
              `;


          }

        }
      );

    }


    /* =================================================
       SHOW PAYMENT SECTION
    ================================================= */

    function showPaymentSection() {


      if (
        !paymentSection
      ) {

        return;

      }


      paymentSection.hidden =
        false;


      updateOrderUI();


      paymentSection.scrollIntoView({

        behavior:
          "smooth",

        block:
          "start"

      });

    }


    /* =================================================
       UPDATE ORDER UI
    ================================================= */

    function updateOrderUI() {


      if (
        !currentOrder
      ) {

        return;

      }


      if (
        orderId
      ) {

        orderId.textContent =
          currentOrder.id;

      }


      if (
        orderStatus
      ) {

        orderStatus.textContent =
          formatStatus(
            currentOrder.status
          );

      }


      if (
        paymentAmount
      ) {

        paymentAmount.textContent =
          currentOrder.amountUsd;

      }


      switch (
        currentOrder.status
      ) {


        case "AWAITING_PAYMENT":

          showAwaitingPayment();

          break;


        case "PENDING_REVIEW":

          showPendingReview();

          break;


        case "CONFIRMED":

          showConfirmedOrder();

          break;


        case "REJECTED":

          showRejectedOrder();

          break;


      }

    }


    /* =================================================
       AWAITING PAYMENT
    ================================================= */

    function showAwaitingPayment() {


      if (
        orderMessage
      ) {

        orderMessage.textContent =
          `Send ${currentOrder.amountUsd} USDT using BEP-20 to the payment address above, then submit your transaction hash.`;

      }


      if (
        paymentForm
      ) {

        paymentForm.hidden =
          false;

      }


      if (
        refreshOrder
      ) {

        refreshOrder.hidden =
          true;

      }

    }


    /* =================================================
       SUBMIT PAYMENT
    ================================================= */

    if (
      paymentForm
    ) {

      paymentForm.addEventListener(
        "submit",
        async (event) => {


          event.preventDefault();


          if (
            !currentOrder
          ) {

            showMessage(
              "Please create an order first.",
              "error"
            );

            return;

          }


          const hash =
            String(
              txHash.value || ""
            ).trim();


          if (
            !isValidTxHash(
              hash
            )
          ) {

            showMessage(
              "Enter a valid 64-character blockchain transaction hash.",
              "error"
            );

            txHash.focus();

            return;

          }


          submitPayment.disabled =
            true;


          submitPayment.textContent =
            "Submitting...";


          try {


            const response =
              await fetch(
                `/api/orders/${currentOrder.id}/submit-payment`,
                {

                  method:
                    "POST",

                  headers: {

                    "Content-Type":
                      "application/json"

                  },

                  body:
                    JSON.stringify({

                      txHash:
                        hash

                    })

                }
              );


            const data =
              await response.json();


            if (
              !response.ok ||
              !data.success
            ) {

              throw new Error(
                data.message ||
                "Payment submission failed."
              );

            }


            currentOrder =
              data.order;


            updateOrderUI();


            showMessage(
              "Transaction submitted for review.",
              "success"
            );


          } catch (error) {


            showMessage(
              error.message,
              "error"
            );


          } finally {


            submitPayment.disabled =
              false;


            submitPayment.textContent =
              "Submit Transaction";

          }

        }
      );

    }


    /* =================================================
       PENDING REVIEW
    ================================================= */

    function showPendingReview() {


      if (
        orderStatus
      ) {

        orderStatus.textContent =
          "PENDING REVIEW";

      }


      if (
        orderMessage
      ) {

        orderMessage.textContent =
          "Your transaction hash has been submitted. Payment verification is required before your CDKs are released.";

      }


      if (
        paymentForm
      ) {

        paymentForm.hidden =
          true;

      }


      if (
        refreshOrder
      ) {

        refreshOrder.hidden =
          false;

      }

    }


    /* =================================================
       REFRESH ORDER
    ================================================= */

    if (
      refreshOrder
    ) {

      refreshOrder.addEventListener(
        "click",
        async () => {


          if (
            !currentOrder
          ) {

            return;

          }


          refreshOrder.disabled =
            true;


          refreshOrder.textContent =
            "Checking...";


          await checkOrder(
            currentOrder.id
          );


          refreshOrder.disabled =
            false;


          refreshOrder.textContent =
            "↻ Check Order Status";

        }
      );

    }


    /* =================================================
       CHECK ORDER
    ================================================= */

    async function checkOrder(
      id
    ) {

      try {


        const response =
          await fetch(
            `/api/orders/${id}`
          );


        const data =
          await response.json();


        if (
          !response.ok ||
          !data.success
        ) {

          throw new Error(
            data.message ||
            "Unable to check order."
          );

        }


        currentOrder =
          data.order;


        updateOrderUI();


        if (
          currentOrder.status ===
          "CONFIRMED"
        ) {

          showMessage(
            "Payment approved. Your CDKs are ready.",
            "success"
          );

        }


        if (
          currentOrder.status ===
          "REJECTED"
        ) {

          showMessage(
            "This order was rejected during payment review.",
            "error"
          );

        }


      } catch (error) {


        showMessage(
          error.message,
          "error"
        );

      }

    }


    /* =================================================
       CONFIRMED ORDER
    ================================================= */

    function showConfirmedOrder() {


      if (
        orderStatus
      ) {

        orderStatus.textContent =
          "CONFIRMED";

      }


      if (
        orderMessage
      ) {

        orderMessage.textContent =
          "Payment has been approved and your CDKs have been assigned.";

      }


      if (
        paymentForm
      ) {

        paymentForm.hidden =
          true;

      }


      if (
        refreshOrder
      ) {

        refreshOrder.hidden =
          true;

      }


      renderCodes(
        currentOrder.codes || []
      );


      showMessage(
        "Your CDKs are ready.",
        "success"
      );

    }


    /* =================================================
       REJECTED ORDER
    ================================================= */

    function showRejectedOrder() {


      if (
        orderStatus
      ) {

        orderStatus.textContent =
          "REJECTED";

      }


      if (
        orderMessage
      ) {

        orderMessage.textContent =
          "This order was rejected during payment review. Please contact support if you believe this is incorrect.";

      }


      if (
        paymentForm
      ) {

        paymentForm.hidden =
          true;

      }


      if (
        refreshOrder
      ) {

        refreshOrder.hidden =
          true;

      }

    }


    /* =================================================
       RENDER RECEIVED CDKs
    ================================================= */

    function renderCodes(
      codes
    ) {


      if (
        !codesContainer
      ) {

        return;

      }


      codesContainer.innerHTML =
        "";


      if (
        !Array.isArray(codes) ||
        codes.length === 0
      ) {

        const empty =
          document.createElement(
            "p"
          );


        empty.textContent =
          "No CDKs have been assigned yet.";


        empty.style.color =
          "var(--muted)";


        codesContainer.appendChild(
          empty
        );


        return;

      }


      codes.forEach(
        (code) => {


          const wrapper =
            document.createElement(
              "div"
            );


          wrapper.className =
            "code-item";


          const text =
            document.createElement(
              "span"
            );


          text.textContent =
            code;


          const button =
            document.createElement(
              "button"
            );


          button.type =
            "button";


          button.textContent =
            "Copy";


          button.addEventListener(
            "click",
            async () => {


              try {


                await copyText(
                  code
                );


                button.textContent =
                  "Copied ✓";


                setTimeout(
                  () => {

                    button.textContent =
                      "Copy";

                  },
                  1300
                );


              } catch {


                showMessage(
                  "Unable to copy CDK.",
                  "error"
                );

              }

            }
          );


          wrapper.appendChild(
            text
          );


          wrapper.appendChild(
            button
          );


          codesContainer.appendChild(
            wrapper
          );

        }
      );

    }


    /* =================================================
       CDK PASTE
    ================================================= */

    if (
      pasteCdkButton &&
      cdkKeyInput
    ) {


      pasteCdkButton.addEventListener(
        "click",
        async () => {


          try {


            const clipboardText =
              await navigator.clipboard.readText();


            if (
              !clipboardText
            ) {

              showCdkMessage(
                "Clipboard is empty.",
                "error"
              );

              return;

            }


            cdkKeyInput.value =
              clipboardText.trim();


            showCdkMessage(
              "CDK pasted successfully.",
              "success"
            );


          } catch (error) {


            showCdkMessage(
              "Clipboard access was blocked. Please paste the CDK manually.",
              "error"
            );

          }

        }
      );

    }


    /* =================================================
       USE CDK
    ================================================= */

    if (
      useCdkButton &&
      cdkKeyInput
    ) {


      useCdkButton.addEventListener(
        "click",
        () => {


          const cdk =
            cdkKeyInput.value.trim();


          if (
            !cdk
          ) {

            showCdkMessage(
              "Please enter your CDK.",
              "error"
            );


            cdkKeyInput.focus();


            return;

          }


          if (
            !isValidCdkFormat(
              cdk
            )
          ) {

            showCdkMessage(
              "Invalid CDK format. A CDK should look like CDK-XXXXXXXXXXXXXXXXXXXX.",
              "error"
            );


            return;

          }


          showCdkMessage(
            "CDK format accepted. Continue through the supported activation process.",
            "success"
          );

        }
      );

    }


    /* =================================================
       CDK MESSAGE
    ================================================= */

    function showCdkMessage(
      message,
      type
    ) {


      if (
        !cdkPasteMessage
      ) {

        return;

      }


      cdkPasteMessage.textContent =
        message;


      cdkPasteMessage.className =
        `cdk-message ${type}`;


      cdkPasteMessage.hidden =
        false;

    }


    /* =================================================
       CDK FORMAT VALIDATION
    ================================================= */

    function isValidCdkFormat(
      value
    ) {

      return /^CDK-[A-Fa-f0-9]{20}$/.test(
        value
      );

    }


    /* =================================================
       TX HASH VALIDATION
    ================================================= */

    function isValidTxHash(
      value
    ) {

      return /^0x[a-fA-F0-9]{64}$/.test(
        value
      );

    }


    /* =================================================
       COPY TEXT
    ================================================= */

    async function copyText(
      value
    ) {


      if (
        navigator.clipboard &&
        window.isSecureContext
      ) {

        await navigator.clipboard.writeText(
          value
        );

        return;

      }


      const textarea =
        document.createElement(
          "textarea"
        );


      textarea.value =
        value;


      textarea.style.position =
        "fixed";

      textarea.style.opacity =
        "0";


      document.body.appendChild(
        textarea
      );


      textarea.select();


      const success =
        document.execCommand(
          "copy"
        );


      textarea.remove();


      if (
        !success
      ) {

        throw new Error(
          "Copy failed."
        );

      }

    }


    /* =================================================
       STATUS FORMATTER
    ================================================= */

    function formatStatus(
      status
    ) {

      return String(
        status || ""
      )
        .replaceAll(
          "_",
          " "
        )
        .toUpperCase();

    }


    /* =================================================
       GLOBAL MESSAGE
    ================================================= */

    function showMessage(
      message,
      type = "info"
    ) {


      const box =
        $("#storeMessage");


      if (
        !box
      ) {

        return;

      }


      box.textContent =
        message;


      box.className =
        `store-message ${type}`;


      box.hidden =
        false;


      clearTimeout(
        showMessage.timeout
      );


      showMessage.timeout =
        setTimeout(
          () => {

            box.hidden =
              true;

          },
          5000
        );

    }


    /* =================================================
       INITIALIZE
    ================================================= */

    updateStoreUI();

    loadConfig();

  }
);