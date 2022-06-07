function Validator(formSelector) {
  //
  var _this = this;
  //
  var formRules = {};

  function getParent(element, selector) {
    while (element.parentElement) {
      if (element.parentElement.matches(selector)) {
        return element.parentElement;
      }
      element = element.parentElement;
    }
  }

  /*  Quy ước tạo rule:
   *  -Nếu có lỗi thì return `error message`
   * -Nếu không có lỗi thì return `undefined`
   */
  var validatorRules = {
    required: function (value) {
      return value ? undefined : "Vui lòng nhập trường này";
    },
    email: function (value) {
      var regex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;

      return regex.test(value) ? undefined : "Email không hợp lệ";
    },
    min: function (min) {
      return function (value) {
        return value.length >= min ? undefined : `Vui lòng nhập tối thiểu ${min} ký tự`;
      };
    },
    max: function (max) {
      return function (value) {
        return value.length <= max ? undefined : `Vui lòng nhập tối đa ${max} ký tự`;
      };
    },
  };

  // Lấy ra form element trong DOM theo `formSelector`
  var formElement = document.querySelector(formSelector);
  // Chỉ xử lý khi có element trong DOM
  if (formElement) {
    var inputs = formElement.querySelectorAll("[name][rules]");

    // Lấy attribute rules của từng input
    for (var input of inputs) {
      var rules = input.getAttribute("rules").split("|");
      for (var rule of rules) {
        var ruleInfo;
        var isRuleHasValue = rule.includes(":");

        if (isRuleHasValue) {
          ruleInfo = rule.split(":");
          rule = ruleInfo[0];
        }

        var ruleFunc = validatorRules[rule];

        // gán lại function để chạy function trong
        if (isRuleHasValue) {
          ruleFunc = ruleFunc(ruleInfo[1]);
        }

        if (Array.isArray(formRules[input.name])) {
          formRules[input.name].push(ruleFunc);
        } else {
          formRules[input.name] = [ruleFunc];
        }
      }

      // Lắng nghe sự kiện để validate (blur, change, submit)
      input.onblur = handleValidate;
      input.oninput = handleClearError;
    }
    // hàm handleValidate(event) có cái tham số"event" để phía dưới ta lấy được biến var rules = formRules[event.target.name];
    //Thì "event.target" ở đây tức nó đang đại diện cho cái element input ( có thể coi event.target = input)
    // Vậy nên về mặt logic, "event.target.name" ở đây, có thể hiểu nó CHÍNH LÀ CÁI "input.name" ...
    // => Mục đích cuối cùng là muốn TRỎ TỚI CÁI "NAME" của input để lấy cái NAME làm Key cho object formRules
    // ...
    // Vậy nên ở đây handleValidate({target:input}) ...
    //đối số truyền vào là một object {target : input} (tạm gọi tên nó là X)
    //khi nó được truyền vào hàm thì lúc này , var rules = formRules[event.target.name]; ở trên sẽ được đổi lại thành var rules = formRules[X.target.name]
    //nhìn vào object X, ta thấy X.target = input
    //nên ta được var rules = formRules[input.name]
    //Cuối cũng thì ta vẫn TRỎ TỚI CÁI "NAME" của input để lấy cái NAME làm Key cho object formRules
    // Hàm thực hiện validate
    function handleValidate(event) {
      var rules = formRules[event.target.name];
      var errorMessage;
      var formGroup = getParent(event.target, ".form-group");

      // cách 1:
      // rules.some(function (rule) {
      //   return errorMessage = rule(event.target.value);
      // });
      // cách 2:
      for (var i = 0; i < rules.length; i++) {
        switch (event.target.type) {
          // rules là array chứa các rule function của mỗi input
          //tại rule[i] thì tham số truyền vào
          // là những input có attribute là gender hoặc interest và được checked
          // nếu đã được check thì errorMessage = undefined (không báo lỗi)
          // nếu chưa thì errorMessage = lỗi
          case "checkbox":
            errorMessage = rules[i](formGroup.querySelector('input[name="interest"]:checked'));
            break;
          case "radio":
            errorMessage = rules[i](formGroup.querySelector('input[name="gender"]:checked'));
            break;
          default:
            errorMessage = rules[i](event.target.value);
        }
        if (errorMessage) break;
      }

      // Nếu có lỗi thì hiển thị message lỗi ra UI
      if (errorMessage) {
        // Kiểm tra xem có tồn tại formGroup k
        if (formGroup) {
          formGroup.classList.add("invalid");
          var formMessage = formGroup.querySelector(".form-message");

          // Kiểm tra xem có tồn tại formMessage k
          if (formMessage) {
            formMessage.innerText = errorMessage;
          }
        }
      }
      return !!errorMessage;
    }

    // Hàm clear message lỗi
    function handleClearError(event) {
      var formGroup = getParent(event.target, ".form-group");
      if (formGroup.classList.contains("invalid")) {
        formGroup.classList.remove("invalid");

        var errorMessage = formGroup.querySelector(".form-message");
        if (errorMessage) {
          errorMessage.innerText = "";
        }
      }
    }
    // console.log(formRules);
  }

  // Xử lý khi ấn nút submit
  formElement.onsubmit = function (event) {
    event.preventDefault();

    var inputs = formElement.querySelectorAll("[name][rules]");
    var isValid = true;

    for (var input of inputs) {
      // nếu không vượt qua kiểm tra validate thì isValid = false
      if (handleValidate({ target: input })) {
        isValid = false;
      }
    }

    // Khi k có lỗi thì submit form
    if (isValid) {
      if (typeof _this.onSubmit === "function") {
        var enablesInput = formElement.querySelectorAll("[name]:not([disable])");
        var formValues = Array.from(enablesInput).reduce(function (values, input) {
          switch (input.type) {
            case "checkbox":
              if (input.matches(":checked")) {
                if (!Array.isArray(values[input.name])) {
                  values[input.name] = [];
                }
                values[input.name].push(input.value);
              }
              break;
            case "radio":
              // chọc vào formElement đấy có thẻ input tên như input.name đã checked và lấy value của nó
              // values[input.name] = formElement.querySelector('input[name="' + input.name + '"]:checked').value;
              if (input.matches(":checked")) {
                values[input.name] = input.value;
              }
              break;
            case "file":
              values[input.name] = input.files;
              break;
            default:
              values[input.name] = input.value;
          }
          return values;
        }, {});

        _this.onSubmit(formValues);
      } else {
        // Hành vi mặc định
        formElement.submit();
      }
    }
  };
}
